import { getOptions } from '../shared/storage.js';
import { buildAppUri } from '../shared/uri-transfer.js';
import { logger } from '../shared/logger.js';

let currentMarkdown = '';
let currentTitle = 'Clipped Note';
let currentFilename = 'clipped-page.md';
let savedOptions = {};

const loadingView = document.getElementById('loading');
const errorView = document.getElementById('error-view');
const errorText = document.getElementById('error-text');
const previewView = document.getElementById('preview-view');
const markdownPreview = document.getElementById('markdown-preview');

const copyBtn = document.getElementById('copy-btn');
const obsidianBtn = document.getElementById('obsidian-btn');
const downloadBtn = document.getElementById('download-btn');
const optionsBtn = document.getElementById('options-btn');

async function initPopup() {
  logger.info('Popup', 'Initializing Decant popup UI...');
  try {
    savedOptions = await getOptions();
    logger.log('Popup', 'Loaded user options:', savedOptions);

    if (savedOptions.defaultAppTarget) {
      const appName = savedOptions.defaultAppTarget.charAt(0).toUpperCase() + savedOptions.defaultAppTarget.slice(1);
      obsidianBtn.textContent = `Open in ${appName}`;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      showError('No active tab found.');
      return;
    }

    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
      showError('Decant cannot clip browser system pages (chrome://). Open a normal website (e.g. news, article, docs) to clip.');
      return;
    }

    let response = await sendMessageToTab(tab.id, { action: 'EXTRACT_MARKDOWN', options: savedOptions });

    if (!response) {
      logger.info('Popup', 'Content script not responding. Attempting dynamic script injection...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js']
        });
        response = await sendMessageToTab(tab.id, { action: 'EXTRACT_MARKDOWN', options: savedOptions });
      } catch (injectErr) {
        logger.error('Popup', 'Dynamic script injection failed:', injectErr);
      }
    }

    if (response && response.status === 'success') {
      currentMarkdown = response.data.markdown;
      currentTitle = response.data.title || 'Clipped Note';
      currentFilename = response.data.filename;
      showPreview(currentMarkdown);
    } else {
      showError(response?.error || 'Could not extract content from this page.');
    }
  } catch (err) {
    logger.error('Popup', 'Unexpected popup init error:', err);
    showError('Cannot clip this tab. Make sure the page is fully loaded.');
  }
}

async function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (res) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(res);
      }
    });
  });
}

function showPreview(markdown) {
  loadingView.classList.add('hidden');
  errorView.classList.add('hidden');
  previewView.classList.remove('hidden');
  markdownPreview.value = markdown;
}

function showError(msg) {
  loadingView.classList.add('hidden');
  previewView.classList.add('hidden');
  errorView.classList.remove('hidden');
  errorText.textContent = msg;
}

copyBtn.addEventListener('click', async () => {
  if (!currentMarkdown) return;
  await navigator.clipboard.writeText(currentMarkdown);
  const origText = copyBtn.textContent;
  copyBtn.textContent = 'Copied! ✓';
  setTimeout(() => {
    copyBtn.textContent = origText;
  }, 1500);
});

obsidianBtn.addEventListener('click', () => {
  if (!currentMarkdown) return;
  const target = savedOptions.defaultAppTarget || 'obsidian';
  const uri = buildAppUri(target, {
    title: currentTitle,
    content: currentMarkdown,
    vault: savedOptions.obsidianVault
  });

  logger.info('Popup', 'Opening PKM app URI:', uri);
  window.open(uri, '_self');
});

downloadBtn.addEventListener('click', () => {
  if (!currentMarkdown) return;
  const blobUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(currentMarkdown);
  chrome.downloads.download({
    url: blobUrl,
    filename: currentFilename,
    saveAs: true
  });
});

optionsBtn.addEventListener('click', () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options/options.html'));
  }
});

document.addEventListener('DOMContentLoaded', initPopup);
