import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { DEFAULT_OPTIONS } from '../shared/storage.js';
import { formatMarkdown, sanitizeFilename } from '../shared/formatter.js';
import { logger } from '../shared/logger.js';

logger.info('ContentScript', 'Decant content script loaded on:', window.location.href);

function createTurndownService(options = DEFAULT_OPTIONS) {
  const turndownService = new TurndownService({
    headingStyle: options.headingStyle || 'atx',
    bulletListMarker: options.bulletListMarker || '-',
    codeBlockStyle: options.codeBlockStyle || 'fenced',
    fence: options.fenceSymbol || '```',
  });

  turndownService.use(gfm);
  return turndownService;
}

export function extractArticle(options = DEFAULT_OPTIONS) {
  logger.log('ContentScript', 'Starting article extraction with options:', options);

  const documentClone = document.cloneNode(true);
  const reader = new Readability(documentClone);
  const article = reader.parse();

  const title = article?.title || document.title || 'Untitled';
  const htmlContent = article?.content || document.body?.innerHTML || '';

  logger.log('ContentScript', 'Extracted title:', title, '| HTML length:', htmlContent?.length);

  const turndownService = createTurndownService(options);
  const markdownBody = turndownService.turndown(htmlContent);

  logger.log('ContentScript', 'Converted Markdown body length:', markdownBody?.length);

  const parsedArticle = {
    title,
    byline: article?.byline || '',
    dir: article?.dir || '',
    excerpt: article?.excerpt || '',
    siteName: article?.siteName || '',
    publishedTime: article?.publishedTime || '',
    url: window.location.href,
    content: markdownBody,
    htmlContent,
  };

  const formattedMarkdown = formatMarkdown(parsedArticle, options);
  const baseFilename = sanitizeFilename(title);

  return {
    ...parsedArticle,
    markdown: formattedMarkdown,
    filename: `${baseFilename}.md`,
    baseFilename,
  };
}

export async function checkAndInjectContinuation() {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    const res = await chrome.storage.local.get('pendingContinuation');
    const data = res?.pendingContinuation;
    if (!data || !data.payload) return;

    // Expire pending continuation after 5 minutes
    if (Date.now() - (data.timestamp || 0) > 300000) {
      await chrome.storage.local.remove('pendingContinuation');
      return;
    }

    const inputSelectors = [
      '#prompt-textarea',
      'div[contenteditable="true"]',
      'textarea',
      '.user-prompt textarea',
      'ms-prompt-editor textarea',
      'rich-textarea div[contenteditable="true"]',
    ];

    const maxAttempts = 20; // poll every 300ms up to 6s
    let attempts = 0;

    const timer = setInterval(async () => {
      attempts++;
      let inputEl = null;

      for (const sel of inputSelectors) {
        inputEl = document.querySelector(sel);
        if (inputEl) break;
      }

      if (inputEl) {
        clearInterval(timer);
        try {
          inputEl.focus();

          if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
            inputEl.value = data.payload;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            // contenteditable element
            let inserted = false;
            try {
              inserted = document.execCommand('insertText', false, data.payload);
            } catch {
              inserted = false;
            }

            if (!inserted || !inputEl.textContent || inputEl.textContent.trim().length === 0) {
              inputEl.textContent = data.payload;
            }
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          }

          await chrome.storage.local.remove('pendingContinuation');
          logger.info('ContentScript', 'Auto-injected decanted prompt into AI chat input.');
        } catch (err) {
          logger.error('ContentScript', 'Error populating input element:', err);
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(timer);
        logger.warn(
          'ContentScript',
          'Could not locate AI chat prompt input element after max attempts.',
        );
      }
    }, 300);
  } catch (e) {
    logger.warn('ContentScript', 'Continuation injection check failed:', e);
  }
}

// Global flag to prevent duplicate event listener registrations on dynamic injection
if (!window.__DECANT_LOADED__) {
  window.__DECANT_LOADED__ = true;

  // Message Listener
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      logger.log('ContentScript', 'Received message:', request);

      if (request.action === 'PING') {
        sendResponse({ status: 'pong' });
        return true;
      }

      if (request.action === 'COPY_TO_CLIPBOARD') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(request.text || '')
            .then(() => sendResponse({ status: 'success' }))
            .catch((err) => sendResponse({ status: 'error', error: err?.message }));
        } else {
          sendResponse({ status: 'error', error: 'Clipboard API unavailable' });
        }
        return true;
      }

      if (request.action === 'EXTRACT_MARKDOWN') {
        try {
          const result = extractArticle(request.options || DEFAULT_OPTIONS);
          logger.info('ContentScript', 'Extraction successful for:', result.title);
          sendResponse({ status: 'success', data: result });
        } catch (err) {
          logger.error('ContentScript', 'Extraction failed:', err);
          sendResponse({ status: 'error', error: err.message });
        }
        return true;
      }
    });
  }

  checkAndInjectContinuation();
}
