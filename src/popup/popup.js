import { getOptions } from '../shared/storage.js';
import { buildAppUri } from '../shared/uri-transfer.js';
import { buildAiPrompt, getAiPlatformUrl, AI_PLATFORMS } from '../shared/ai-transfer.js';
import { isAiChatUrl } from '../shared/ai-detect.js';
import { logger } from '../shared/logger.js';

// ── State ─────────────────────────────────────────────────────────
let currentMarkdown = '';
let currentTitle    = 'Clipped Note';
let currentUrl      = '';
let articleData     = null;   // full data object for session handoff
let savedOptions    = {};

// ── DOM refs ──────────────────────────────────────────────────────
const loadingView   = document.getElementById('loading');
const errorView     = document.getElementById('error-view');
const errorText     = document.getElementById('error-text');
const successView   = document.getElementById('success-view');
const successTitle  = document.getElementById('success-title');

const copyBtn       = document.getElementById('copy-btn');
const downloadMdBtn = document.getElementById('download-md-btn');
const appSelect     = document.getElementById('app-select');
const obsidianBtn   = document.getElementById('obsidian-btn');
const aiSelect      = document.getElementById('ai-select');
const aiBtn         = document.getElementById('ai-btn');
const formatSelect  = document.getElementById('format-select');
const mdActions     = document.getElementById('md-actions');
const previewActions= document.getElementById('preview-actions');
const exportBtn     = document.getElementById('export-btn');
const optionsBtn    = document.getElementById('options-btn');
const aiTipBanner   = document.getElementById('ai-tip-banner');
const pngWarningBanner = document.getElementById('png-warning-banner');

// ── Init ──────────────────────────────────────────────────────────
async function initPopup() {
  logger.info('Popup', 'Initializing Decant popup UI…');
  try {
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

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      showError('No active tab found.');
      return;
    }

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
        currentUrl.startsWith('about:'))
    ) {
      showError(
        'Decant cannot clip browser system pages. Open a normal website (e.g. news, article, docs) to clip.',
      );
      return;
    }

    // Extract article
    let response = await sendMessageToTab(tab.id, {
      action: 'EXTRACT_MARKDOWN',
      options: savedOptions,
    });

    if (!response) {
      logger.info('Popup', 'Content script not responding — injecting dynamically…');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js'],
        });
        response = await sendMessageToTab(tab.id, {
          action: 'EXTRACT_MARKDOWN',
          options: savedOptions,
        });
      } catch (injectErr) {
        logger.error('Popup', 'Dynamic script injection failed:', injectErr);
      }
    }

    if (response && response.status === 'success') {
      const d = response.data;
      currentMarkdown = d.markdown;
      currentTitle    = d.title || 'Clipped Note';
      currentUrl      = d.url || currentUrl;

      // Store full article data for the preview tab
      articleData = {
        title:         d.title || 'Untitled',
        markdown:      d.markdown,
        htmlContent:   d.htmlContent || '',
        url:           d.url || currentUrl,
        byline:        d.byline || '',
        siteName:      d.siteName || '',
        excerpt:       d.excerpt || '',
        publishedTime: d.publishedTime || '',
        baseFilename:  d.baseFilename || 'clipped-page',
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
async function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (res) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(res);
    });
  });
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
    const targetTab = formatSelect ? formatSelect.value : 'md';

    // Set auto-action flags based on format
    const autoPrint = targetTab === 'pdf';
    const autoDownloadPng = targetTab === 'png';

    await new Promise((resolve, reject) => {
      chrome.storage.session.set({
        [key]: articleData,
        autoPrint,
        autoDownloadPng
      }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve();
      });
    });

    await chrome.tabs.create({
      url: chrome.runtime.getURL(`preview/preview.html?key=${key}&tab=${targetTab}`),
    });
    exportBtn.textContent = '✓ Preview Opened';
  } catch (err) {
    logger.error('Popup', 'Failed to open preview tab:', err);
    exportBtn.textContent = '🔍 Preview & Save';
    exportBtn.disabled = false;
  }
}

// ── Action listeners ──────────────────────────────────────────────
copyBtn.addEventListener('click', async () => {
  if (!currentMarkdown) return;
  await navigator.clipboard.writeText(currentMarkdown);
  const orig = copyBtn.textContent;
  copyBtn.textContent = '✓ Copied';
  setTimeout(() => { copyBtn.textContent = orig; }, 1500);
});

downloadMdBtn.addEventListener('click', () => {
  if (!currentMarkdown || !articleData) return;
  const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = `${articleData.baseFilename || 'clipped-page'}.md`;
  chrome.downloads.download({ url, filename, saveAs: true }, () => {
    URL.revokeObjectURL(url);
  });
});

if (appSelect) {
  appSelect.addEventListener('change', updateAppButtonLabel);
}

obsidianBtn.addEventListener('click', () => {
  if (!currentMarkdown) return;
  const target = appSelect ? appSelect.value : (savedOptions.defaultAppTarget || 'obsidian');
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
  const target = aiSelect ? aiSelect.value : (savedOptions.defaultAiTarget || 'chatgpt');

  const prompt = buildAiPrompt({
    title: currentTitle,
    url: currentUrl,
    content: currentMarkdown,
    template: savedOptions.aiPromptTemplate,
  });

  await navigator.clipboard.writeText(prompt);
  logger.info('Popup', 'Copied AI prompt and opening:', target);
  chrome.tabs.create({ url: getAiPlatformUrl(target) });
});

if (formatSelect) {
  formatSelect.addEventListener('change', () => {
    const val = formatSelect.value;
    if (val === 'md') {
      mdActions.classList.remove('hidden');
      previewActions.classList.add('hidden');
    } else {
      mdActions.classList.add('hidden');
      previewActions.classList.remove('hidden');
      exportBtn.textContent = '🔍 Preview & Save';
    }
    if (pngWarningBanner) {
      pngWarningBanner.classList.toggle('hidden', val !== 'png');
    }
  });
}

exportBtn.addEventListener('click', openExportPreview);

optionsBtn.addEventListener('click', () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options/options.html'));
  }
});

document.addEventListener('DOMContentLoaded', initPopup);
