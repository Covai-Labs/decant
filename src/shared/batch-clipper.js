import JSZip from 'jszip';
import { browser } from 'wxt/browser';
import { logger } from './logger.js';

export const RESTRICTED_SCHEMES = [
  'chrome://',
  'edge://',
  'about:',
  'chrome-extension://',
  'moz-extension://',
  'view-source:',
  'javascript:',
  'data:',
  'devtools://',
];

export const RESTRICTED_HOSTS = ['chromewebstore.google.com', 'addons.mozilla.org'];

/**
 * Checks if a tab URL can have content scripts injected and content extracted.
 * @param {{ url?: string }} tab
 * @returns {boolean}
 */
export function isExtractableTab(tab) {
  if (!tab || !tab.url || typeof tab.url !== 'string') return false;
  const url = tab.url.trim();
  if (RESTRICTED_SCHEMES.some((scheme) => url.startsWith(scheme))) {
    return false;
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    if (RESTRICTED_HOSTS.includes(parsed.hostname.toLowerCase())) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

/**
 * Ensures all results have unique filenames by appending index numbers to duplicates.
 * @param {Array<{ filename?: string, baseFilename?: string, [key: string]: any }>} results
 * @returns {Array<{ filename: string, [key: string]: any }>}
 */
export function deduplicateFilenames(results) {
  const counts = new Map();
  return results.map((item, index) => {
    let name = item.filename || `${item.baseFilename || `tab-${index + 1}`}.md`;
    if (!name.endsWith('.md')) {
      name = `${name}.md`;
    }

    if (counts.has(name)) {
      const currentCount = counts.get(name) + 1;
      counts.set(name, currentCount);
      const base = name.slice(0, -3);
      name = `${base}-${currentCount}.md`;
    } else {
      counts.set(name, 0);
    }

    return {
      ...item,
      filename: name,
    };
  });
}

/**
 * Generates a combined Markdown document with a Table of Contents.
 * @param {Array<{ title: string, markdown: string, url?: string }>} results
 * @param {string} [dateStr]
 * @returns {string}
 */
export function formatCombinedMarkdown(results, dateStr = new Date().toISOString().split('T')[0]) {
  if (!results || results.length === 0) return '';

  const toc = results
    .map((r, i) => `${i + 1}. [${r.title || `Tab ${i + 1}`}](#tab-${i + 1})`)
    .join('\n');

  const sections = results
    .map((r, i) => {
      const anchor = `<a id="tab-${i + 1}"></a>`;
      return `${anchor}\n\n${r.markdown || ''}`;
    })
    .join('\n\n---\n\n');

  return `---
title: Decanted Tabs (${dateStr})
date: ${dateStr}
total_tabs: ${results.length}
generator: Decant Web Clipper
---

# Decanted Tabs (${dateStr})

## Table of Contents

${toc}

---

${sections}
`;
}

/**
 * Builds a ZIP archive as a base64 Data URL.
 * @param {Array<{ filename: string, markdown: string }>} results
 * @returns {Promise<string>} data URL of ZIP archive
 */
export async function generateZipArchive(results) {
  const zip = new JSZip();
  const deduped = deduplicateFilenames(results);

  for (const item of deduped) {
    zip.file(item.filename, item.markdown || '');
  }

  const base64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return `data:application/zip;base64,${base64}`;
}

/**
 * Helper to safely send message to a tab with retries.
 */
async function sendMessageToTab(tabId, message, maxRetries = 1, retryDelay = 60) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await new Promise((resolve) => {
      browser.tabs.sendMessage(tabId, message, (response) => {
        if (browser.runtime.lastError) {
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
    if (res) return res;
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
  return null;
}

/**
 * Clips all valid tabs in a browser window with concurrency throttling and download triggering.
 * @param {Object} options Decant clipping options
 * @param {'zip' | 'combined' | 'separate'} [mode='zip'] Export mode
 * @param {number|null} [windowId=null] Target window ID (defaults to current window)
 * @param {Function|null} [onProgress=null] Callback (processed, total, currentTabTitle)
 * @returns {Promise<{ total: number, extracted: number, failed: number }>}
 */
export async function clipAllTabs(options = {}, mode = 'zip', windowId = null, onProgress = null) {
  const queryInfo = windowId ? { windowId } : { currentWindow: true };
  const tabs = await browser.tabs.query(queryInfo);
  const validTabs = tabs.filter(isExtractableTab);

  if (validTabs.length === 0) {
    throw new Error('No extractable web pages found in this window.');
  }

  logger.info(
    'BatchClipper',
    `Found ${validTabs.length} extractable tabs out of ${tabs.length} total. Mode: ${mode}`,
  );

  const concurrencyLimit = 4;
  const results = [];
  let processed = 0;

  async function processTab(tab) {
    try {
      let res = await sendMessageToTab(tab.id, { action: 'EXTRACT_MARKDOWN', options }, 1, 50);

      if (!res) {
        // Dynamically inject content script if not already responding
        try {
          await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-scripts/content.js'],
          });
          res = await sendMessageToTab(tab.id, { action: 'EXTRACT_MARKDOWN', options }, 3, 100);
        } catch (injectErr) {
          logger.warn('BatchClipper', `Script injection failed for tab ${tab.id}:`, injectErr);
        }
      }

      if (res && res.status === 'success' && res.data) {
        results.push(res.data);
      }
    } catch (err) {
      logger.warn('BatchClipper', `Failed extracting tab ${tab.id} (${tab.title}):`, err);
    } finally {
      processed++;
      if (typeof onProgress === 'function') {
        onProgress(processed, validTabs.length, tab.title || '');
      }
    }
  }

  // Process in chunks of concurrencyLimit
  for (let i = 0; i < validTabs.length; i += concurrencyLimit) {
    const chunk = validTabs.slice(i, i + concurrencyLimit);
    await Promise.all(chunk.map((t) => processTab(t)));
  }

  if (results.length === 0) {
    throw new Error('Could not extract markdown from any open tabs.');
  }

  const timestamp = new Date().toISOString().split('T')[0];

  if (mode === 'zip') {
    const zipDataUrl = await generateZipArchive(results);
    await browser.downloads.download({
      url: zipDataUrl,
      filename: `decanted-tabs-${timestamp}.zip`,
      saveAs: false,
    });
  } else if (mode === 'combined') {
    const combinedDoc = formatCombinedMarkdown(results, timestamp);
    const dataUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(combinedDoc)}`;
    await browser.downloads.download({
      url: dataUrl,
      filename: `decanted-all-tabs-${timestamp}.md`,
      saveAs: false,
    });
  } else {
    // Separate individual downloads with throttling
    const deduped = deduplicateFilenames(results);
    for (const item of deduped) {
      const dataUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(item.markdown)}`;
      await browser.downloads.download({
        url: dataUrl,
        filename: item.filename,
        saveAs: false,
      });
      await new Promise((r) => setTimeout(r, 180));
    }
  }

  return {
    total: validTabs.length,
    extracted: results.length,
    failed: validTabs.length - results.length,
  };
}
