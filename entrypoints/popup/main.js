import { browser } from 'wxt/browser';
import { getOptions } from '../../src/shared/storage.js';
import { buildAppUri } from '../../src/shared/uri-transfer.js';
import { buildAiPrompt, getAiPlatformUrl } from '../../src/shared/ai-transfer.js';
import { isAiChatUrl } from '../../src/shared/ai-detect.js';
import { logger } from '../../src/shared/logger.js';
import { initI18n } from '../../src/shared/i18n.js';

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
const aiTipBanner = document.getElementById('ai-tip-banner');
const pngWarningBanner = document.getElementById('png-warning-banner');

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

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      showError('No active tab found.');
      return;
    }

    currentTabId = tab.id;
    currentUrl = tab.url || '';

    // AI Chat tip banner
    if (isAiChatUrl(currentUrl)) {
      logger.info('Popup', 'AI Chat page detected — showing AI Chat Exporter tip.');
      if (aiTipBanner) aiTipBanner.classList.remove('hidden');
    }

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
    await browser.storage.local.set({
      pendingContinuation: {
        payload: prompt,
        targetPlatform: target,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    logger.error('Popup', 'Failed to save pendingContinuation:', err);
  }

  logger.info('Popup', 'Copied AI prompt and opening:', target);
  browser.tabs.create({ url: getAiPlatformUrl(target) });
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

optionsBtn.addEventListener('click', () => {
  if (browser.runtime.openOptionsPage) {
    browser.runtime.openOptionsPage();
  } else {
    window.open(browser.runtime.getURL('/options.html'));
  }
});

document.addEventListener('DOMContentLoaded', initPopup);
