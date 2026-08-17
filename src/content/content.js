import { Readability } from '../vendor/readability/index.js';
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

export function showDecantToast(message = 'Decanted to clipboard!') {
  try {
    if (!document.body) return;

    let host = document.getElementById('decant-toast-root');
    if (!host) {
      host = document.createElement('div');
      host.id = 'decant-toast-root';
      host.style.position = 'fixed';
      host.style.top = '24px';
      host.style.right = '24px';
      host.style.zIndex = '2147483647';
      host.style.pointerEvents = 'none';
      document.body.appendChild(host);
    }

    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });

    // Inject shared styles if not already present in shadowRoot
    if (!shadow.querySelector('style')) {
      const style = document.createElement('style');
      style.textContent = `
        .decant-toast {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #0f172a;
          color: #f8fafc;
          border: 1px solid #334155;
          border-left: 4px solid #8b5cf6;
          padding: 12px 18px;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.4;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
          transform: translateY(-12px);
          opacity: 0;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
          pointer-events: auto;
          margin-bottom: 8px;
        }
        .decant-toast.show {
          transform: translateY(0);
          opacity: 1;
        }
        .decant-toast-icon {
          font-size: 16px;
        }
        .decant-toast-msg {
          color: #f8fafc;
        }
      `;
      shadow.appendChild(style);
    }

    const toast = document.createElement('div');
    toast.className = 'decant-toast';
    toast.innerHTML = `
      <span class="decant-toast-icon">🍷</span>
      <span class="decant-toast-msg">${message}</span>
    `;

    shadow.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
        if (shadow.querySelectorAll('.decant-toast').length === 0 && host.parentNode) {
          host.remove();
        }
      }, 300);
    }, 2200);
  } catch (err) {
    logger.warn('ContentScript', 'Failed to display toast:', err);
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

      if (request.action === 'SHOW_TOAST') {
        showDecantToast(request.message || 'Decanted to clipboard!');
        sendResponse({ status: 'success' });
        return true;
      }

      if (request.action === 'COPY_TO_CLIPBOARD') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(request.text || '')
            .then(() => {
              showDecantToast(request.message || 'Decanted to clipboard!');
              sendResponse({ status: 'success' });
            })
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
