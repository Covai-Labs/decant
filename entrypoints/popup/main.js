import { browser } from 'wxt/browser';
import { getOptions } from '../../src/shared/storage.js';
import { buildAppUri } from '../../src/shared/uri-transfer.js';
import { buildAiPrompt } from '../../src/shared/ai-transfer.js';
import { logger } from '../../src/shared/logger.js';
import { initI18n, getMessage } from '../../src/shared/i18n.js';
import { isExtractableTab } from '../../src/shared/batch-clipper.js';

// ── State ─────────────────────────────────────────────────────────
let currentMarkdown = '';
let currentTitle = 'Clipped Note';
let currentUrl = '';
let currentTabId = null;
let articleData = null; // full data object for session handoff
let savedOptions = {};

// ── DOM refs ──────────────────────────────────────────────────────
const loadingView = document.getElementById('loading');
const errorView = document.getElementById('error-view');
const errorText = document.getElementById('error-text');
const successView = document.getElementById('success-view');
const successTitle = document.getElementById('success-title');

const copyBtn = document.getElementById('copy-btn');
const downloadMdBtn = document.getElementById('download-md-btn');
const appSelect = document.getElementById('app-select');
const obsidianBtn = document.getElementById('obsidian-btn');
const aiSelect = document.getElementById('ai-select');
const aiBtn = document.getElementById('ai-btn');
const formatSelect = document.getElementById('format-select');
const mdActions = document.getElementById('md-actions');
const exportBtn = document.getElementById('export-btn');
const optionsBtn = document.getElementById('options-btn');
const pngWarningBanner = document.getElementById('png-warning-banner');

const clipAllBtn = document.getElementById('clip-all-btn');
const tabCountBadge = document.getElementById('tab-count-badge');
const batchModeSelect = document.getElementById('batch-mode-select');
const batchProgressContainer = document.getElementById('batch-progress-container');
const batchProgressFill = document.getElementById('batch-progress-fill');
const batchProgressText = document.getElementById('batch-progress-text');

async function loadCommandShortcuts() {
  try {
    if (!browser.commands || !browser.commands.getAll) return;
    const commands = await new Promise((resolve) => browser.commands.getAll(resolve));
    if (!commands || !Array.isArray(commands)) return;

    for (const cmd of commands) {
      if (cmd.name === 'copy_tab_as_markdown' && cmd.shortcut && copyBtn) {
        copyBtn.setAttribute('title', `Copy Markdown to clipboard (${cmd.shortcut})`);
      } else if (cmd.name === 'clip_tab_as_markdown' && cmd.shortcut && downloadMdBtn) {
        downloadMdBtn.setAttribute('title', `Download Markdown file (${cmd.shortcut})`);
      } else if (cmd.name === 'clip_all_tabs' && cmd.shortcut && clipAllBtn) {
        clipAllBtn.setAttribute('title', `Clip all open tabs in this window (${cmd.shortcut})`);
      }
    }
  } catch (err) {
    logger.warn('Popup', 'Could not retrieve command shortcuts:', err);
  }
}

// ── Init ──────────────────────────────────────────────────────────
async function initPopup() {
  logger.info('Popup', 'Initializing Decant popup UI…');
  try {
    await initI18n();
    await loadCommandShortcuts();
    savedOptions = await getOptions();

    // PKM app target selection
    if (savedOptions.defaultAppTarget && savedOptions.defaultAppTarget !== 'none' && appSelect) {
      appSelect.value = savedOptions.defaultAppTarget;
    }
    updateAppButtonLabel();

    // AI target selection
    if (savedOptions.defaultAiTarget && savedOptions.defaultAiTarget !== 'none' && aiSelect) {
      aiSelect.value = savedOptions.defaultAiTarget;
    }

    // Update open tabs badge count
    try {
      const allTabs = await browser.tabs.query({ currentWindow: true });
      const extractableTabs = allTabs.filter(isExtractableTab);
      if (tabCountBadge) {
        tabCountBadge.textContent = String(extractableTabs.length);
      }
      if (clipAllBtn && extractableTabs.length === 0) {
        clipAllBtn.disabled = true;
      }
    } catch (tabErr) {
      logger.warn('Popup', 'Could not query window tabs for batch badge:', tabErr);
    }

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      showError('No active tab found.');
      return;
    }

    currentTabId = tab.id;
    currentUrl = tab.url || '';

    // Restricted pages
    if (
      currentUrl &&
      (currentUrl.startsWith('chrome://') ||
        currentUrl.startsWith('edge://') ||
        currentUrl.startsWith('about:') ||
        currentUrl.startsWith('chrome-extension://') ||
        currentUrl.startsWith('moz-extension://') ||
        currentUrl.startsWith('view-source:'))
    ) {
      showError(
        'Decant cannot clip browser system pages. Open a normal website (e.g. news, article, docs) to clip.',
      );
      return;
    }

    // Extract article (attempt quick connect with 1 retry)
    let response = await sendMessageToTab(
      tab.id,
      {
        action: 'EXTRACT_MARKDOWN',
        options: savedOptions,
      },
      1,
      50,
    );

    if (!response) {
      logger.info('Popup', 'Content script not responding — injecting dynamically…');
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/content.js'],
        });
        // Retry polling to allow the dynamically injected content script to initialize its listeners
        response = await sendMessageToTab(
          tab.id,
          {
            action: 'EXTRACT_MARKDOWN',
            options: savedOptions,
          },
          5,
          100,
        );
      } catch (injectErr) {
        logger.error('Popup', 'Dynamic script injection failed:', injectErr);
      }
    }

    if (response && response.status === 'success') {
      const d = response.data;
      currentMarkdown = d.markdown;
      currentTitle = d.title || 'Clipped Note';
      currentUrl = d.url || currentUrl;

      // Store full article data for the preview tab
      articleData = {
        title: d.title || 'Untitled',
        markdown: d.markdown,
        htmlContent: d.htmlContent || '',
        url: d.url || currentUrl,
        byline: d.byline || '',
        siteName: d.siteName || '',
        excerpt: d.excerpt || '',
        publishedTime: d.publishedTime || '',
        baseFilename: d.baseFilename || 'clipped-page',
      };

      showSuccess(currentTitle);
    } else {
      showError(response?.error || 'Could not extract content from this page.');
    }
  } catch (err) {
    logger.error('Popup', 'Unexpected popup init error:', err);
    showError('Cannot clip this tab. Make sure the page is fully loaded.');
  }
}

function updateAppButtonLabel() {
  if (!appSelect || !obsidianBtn) return;
  const val = appSelect.value;
  const appName = val.charAt(0).toUpperCase() + val.slice(1);
  obsidianBtn.textContent = `Open in ${appName}`;
}

// ── Messaging ─────────────────────────────────────────────────────
async function sendMessageToTab(tabId, message, maxRetries = 0, retryDelay = 100) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await new Promise((resolve) => {
      browser.tabs.sendMessage(tabId, message, (res) => {
        if (browser.runtime.lastError) resolve(null);
        else resolve(res);
      });
    });
    if (res) return res;
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
  return null;
}

// ── Views ─────────────────────────────────────────────────────────
function showSuccess(title) {
  loadingView.classList.add('hidden');
  errorView.classList.add('hidden');
  successView.classList.remove('hidden');
  successTitle.textContent = title;
}

function showError(msg) {
  loadingView.classList.add('hidden');
  successView.classList.add('hidden');
  errorView.classList.remove('hidden');
  errorText.textContent = msg;
  if (exportBtn) exportBtn.disabled = true;
}

// ── Open Export Preview tab ────────────────────────────────────────
async function openExportPreview() {
  if (!articleData) return;
  exportBtn.disabled = true;
  exportBtn.textContent = 'Opening…';

  try {
    const key = `decant_${Date.now()}`;
    const selectedFormat = formatSelect ? formatSelect.value : 'md';
    const targetTab = selectedFormat === 'md' ? 'markdown' : selectedFormat;

    // Set auto-action flags based on format
    const autoPrint = selectedFormat === 'pdf';
    const autoDownloadPng = selectedFormat === 'png';

    await new Promise((resolve, reject) => {
      browser.storage.session.set(
        {
          [key]: articleData,
          autoPrint,
          autoDownloadPng,
        },
        () => {
          if (browser.runtime.lastError) reject(browser.runtime.lastError);
          else resolve();
        },
      );
    });

    await browser.tabs.create({
      url: browser.runtime.getURL(`/preview.html?key=${key}&tab=${targetTab}`),
    });
    exportBtn.textContent = '✓ Preview Opened';
  } catch (err) {
    logger.error('Popup', 'Failed to open preview tab:', err);
    exportBtn.textContent = '🔍 Preview in new tab';
    exportBtn.disabled = false;
  }
}

// ── Action listeners ──────────────────────────────────────────────
copyBtn.addEventListener('click', async () => {
  if (!currentMarkdown) return;
  await navigator.clipboard.writeText(currentMarkdown);
  const orig = copyBtn.textContent;
  copyBtn.textContent = '✓ Copied';

  if (currentTabId) {
    sendMessageToTab(currentTabId, {
      action: 'SHOW_TOAST',
      message: 'Decanted to clipboard!',
    }).catch(() => {});
  }

  setTimeout(() => {
    copyBtn.textContent = orig;
  }, 1500);
});

downloadMdBtn.addEventListener('click', () => {
  if (!currentMarkdown || !articleData) return;
  const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = `${articleData.baseFilename || 'clipped-page'}.md`;
  browser.downloads.download({ url, filename, saveAs: true }, () => {
    URL.revokeObjectURL(url);
  });
});

if (appSelect) {
  appSelect.addEventListener('change', updateAppButtonLabel);
}

obsidianBtn.addEventListener('click', () => {
  if (!currentMarkdown) return;
  const target = appSelect ? appSelect.value : savedOptions.defaultAppTarget || 'obsidian';
  if (target === 'none') return;
  const uri = buildAppUri(target, {
    title: currentTitle,
    content: currentMarkdown,
    vault: savedOptions.obsidianVault,
  });
  logger.info('Popup', 'Opening PKM app URI:', uri);
  window.open(uri, '_self');
});

aiBtn.addEventListener('click', async () => {
  if (!currentMarkdown) return;
  const target = aiSelect ? aiSelect.value : savedOptions.defaultAiTarget || 'chatgpt';

  const prompt = buildAiPrompt({
    title: currentTitle,
    url: currentUrl,
    content: currentMarkdown,
    template: savedOptions.aiPromptTemplate,
  });

  try {
    await navigator.clipboard.writeText(prompt);
  } catch (err) {
    logger.warn('Popup', 'Clipboard writeText failed:', err);
  }

  try {
    const response = await browser.runtime.sendMessage({
      action: 'TRANSFER_CHAT',
      targetPlatform: target,
      title: currentTitle,
      payload: prompt,
    });

    if (response && response.success) {
      logger.info('Popup', 'Transfer initiated for:', target);
    } else {
      logger.error('Popup', 'Transfer failed:', response?.error);
    }
  } catch (err) {
    logger.error('Popup', 'Failed to send TRANSFER_CHAT message:', err);
  }
});

if (formatSelect) {
  formatSelect.addEventListener('change', () => {
    const val = formatSelect.value;
    if (val === 'md') {
      mdActions.classList.remove('hidden');
    } else {
      mdActions.classList.add('hidden');
    }
    exportBtn.textContent = '🔍 Preview in new tab';
    if (pngWarningBanner) {
      pngWarningBanner.classList.toggle('hidden', val !== 'png');
    }
  });
}

exportBtn.addEventListener('click', openExportPreview);

// ── Batch Multi-Tab Clipping ──────────────────────────────────────
if (clipAllBtn) {
  clipAllBtn.addEventListener('click', async () => {
    const mode = batchModeSelect ? batchModeSelect.value : 'zip';
    clipAllBtn.disabled = true;
    if (batchProgressContainer) batchProgressContainer.classList.remove('hidden');
    if (batchProgressFill) batchProgressFill.style.width = '5%';
    if (batchProgressText)
      batchProgressText.textContent = getMessage('clippingTabsProgress', 'Extracting tabs…');

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      const windowId = tab?.windowId || null;
      await browser.runtime.sendMessage({
        action: 'BATCH_CLIP_TABS',
        mode,
        windowId,
        options: savedOptions,
      });
    } catch (err) {
      logger.error('Popup', 'Failed to trigger batch clip:', err);
      if (batchProgressText) batchProgressText.textContent = 'Failed to start batch clipping.';
      clipAllBtn.disabled = false;
    }
  });
}

browser.runtime.onMessage.addListener((request) => {
  if (request.action === 'BATCH_PROGRESS') {
    if (batchProgressContainer) batchProgressContainer.classList.remove('hidden');
    const pct = Math.round((request.processed / request.total) * 100);
    if (batchProgressFill) batchProgressFill.style.width = `${pct}%`;
    if (batchProgressText) {
      const msg = getMessage('clippingProgress', `Clipping $1 of $2 tabs…`, [
        String(request.processed),
        String(request.total),
      ]);
      batchProgressText.textContent = msg;
    }
  } else if (request.action === 'BATCH_COMPLETE') {
    if (batchProgressFill) batchProgressFill.style.width = '100%';
    if (batchProgressText) {
      const msg = getMessage('batchComplete', `Successfully clipped $1 tabs!`, [
        String(request.result?.extracted || 0),
      ]);
      batchProgressText.textContent = `✓ ${msg}`;
    }
    setTimeout(() => {
      if (batchProgressContainer) batchProgressContainer.classList.add('hidden');
      if (clipAllBtn) clipAllBtn.disabled = false;
    }, 2500);
  } else if (request.action === 'BATCH_ERROR') {
    if (batchProgressText) {
      batchProgressText.textContent = `Error: ${request.error || 'Failed to clip tabs'}`;
    }
    if (clipAllBtn) clipAllBtn.disabled = false;
  }
});

optionsBtn.addEventListener('click', () => {
  if (browser.runtime.openOptionsPage) {
    browser.runtime.openOptionsPage();
  } else {
    window.open(browser.runtime.getURL('/options.html'));
  }
});

document.addEventListener('DOMContentLoaded', initPopup);
