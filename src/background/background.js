import { DEFAULT_OPTIONS, getOptions } from '../shared/storage.js';
import { logger } from '../shared/logger.js';

logger.info('Background', 'Decant Background Service Worker initialized.');

// Setup Context Menus
chrome.runtime.onInstalled.addListener(() => {
  logger.info('Background', 'Extension installed/updated. Creating context menus...');
  chrome.contextMenus.create({
    id: 'decant-page',
    title: 'Decant page to Markdown',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'decant-selection',
    title: 'Decant selection to Markdown',
    contexts: ['selection']
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;
  logger.info('Background', 'Context menu clicked:', info.menuItemId, '| Tab:', tab.id);
  const options = await getOptions();

  if (info.menuItemId === 'decant-page') {
    clipTab(tab.id, options);
  } else if (info.menuItemId === 'decant-selection') {
    clipTab(tab.id, options);
  }
});

// Handle Keyboard Commands
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab || !tab.id) return;
  logger.info('Background', 'Command triggered:', command, '| Tab:', tab.id);
  const options = await getOptions();

  if (command === 'clip_tab_as_markdown') {
    clipTab(tab.id, options);
  } else if (command === 'copy_tab_as_markdown') {
    copyTabToClipboard(tab.id, options);
  }
});

async function clipTab(tabId, options) {
  try {
    let response = await sendMessageToTab(tabId, { action: 'EXTRACT_MARKDOWN', options });

    if (!response) {
      logger.info('Background', 'Injecting content script dynamically into tab:', tabId);
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js']
      });
      response = await sendMessageToTab(tabId, { action: 'EXTRACT_MARKDOWN', options });
    }

    if (response && response.status === 'success') {
      logger.info('Background', 'Clipping tab successful. Downloading:', response.data.filename);
      downloadMarkdown(response.data.filename, response.data.markdown);
    } else {
      logger.error('Background', 'Tab clipping failed:', response?.error);
    }
  } catch (err) {
    logger.error('Background', 'Error clipping tab:', err);
  }
}

async function copyTabToClipboard(tabId, options) {
  try {
    let response = await sendMessageToTab(tabId, { action: 'EXTRACT_MARKDOWN', options });

    if (!response) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js']
      });
      response = await sendMessageToTab(tabId, { action: 'EXTRACT_MARKDOWN', options });
    }

    if (response && response.status === 'success') {
      logger.info('Background', 'Copying markdown to clipboard...');
      chrome.tabs.sendMessage(tabId, {
        action: 'COPY_TO_CLIPBOARD',
        text: response.data.markdown
      });
    }
  } catch (err) {
    logger.error('Background', 'Error copying tab to clipboard:', err);
  }
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (res) => {
      if (chrome.runtime.lastError) {
        logger.warn('Background', 'sendMessage lastError:', chrome.runtime.lastError.message);
        resolve(null);
      } else {
        resolve(res);
      }
    });
  });
}

function downloadMarkdown(filename, content) {
  const blobUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(content);
  chrome.downloads.download({
    url: blobUrl,
    filename: filename,
    saveAs: false
  });
}
