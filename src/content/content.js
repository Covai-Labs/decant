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
  const htmlContent = article?.content || document.body.innerHTML;

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

// Global flag to indicate content script readiness
window.__DECANT_LOADED__ = true;

// Message Listener
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    logger.log('ContentScript', 'Received message:', request);

    if (request.action === 'PING') {
      sendResponse({ status: 'pong' });
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
