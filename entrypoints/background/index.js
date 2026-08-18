import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';
import { getOptions } from '../../src/shared/storage.js';
import { getAiPlatformUrl } from '../../src/shared/ai-transfer.js';
import { logger } from '../../src/shared/logger.js';
import { getMessage } from '../../src/shared/i18n.js';

const UNINSTALL_URL = 'https://decant.covai.org/uninstall-feedback.html';
const WELCOME_URL = 'https://decant.covai.org/welcome.html';

export default defineBackground({
  type: 'module',
  main() {
    logger.info('Background', 'Decant Background Service Worker initialized.');

    browser.runtime.setUninstallURL(UNINSTALL_URL);

    // Setup Context Menus & Onboarding
    browser.runtime.onInstalled.addListener((details) => {
      logger.info('Background', 'Extension event details:', details.reason);

      if (details.reason === 'install') {
        browser.tabs.create({ url: WELCOME_URL });
      }

      browser.contextMenus.create({
        id: 'decant-page',
        title: getMessage('contextMenuPage', 'Decant page to Markdown'),
        contexts: ['page'],
      });

      browser.contextMenus.create({
        id: 'decant-selection',
        title: getMessage('contextMenuSelection', 'Decant selection to Markdown'),
        contexts: ['selection'],
      });
    });

    // Handle Context Menu clicks
    browser.contextMenus.onClicked.addListener(async (info, tab) => {
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
    browser.commands.onCommand.addListener(async (command, tab) => {
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
        let response = await sendMessageToTab(
          tabId,
          { action: 'EXTRACT_MARKDOWN', options },
          1,
          50,
        );

        if (!response) {
          logger.info('Background', 'Injecting content script dynamically into tab:', tabId);
          await browser.scripting.executeScript({
            target: { tabId },
            files: ['content-scripts/content.js'],
          });
          response = await sendMessageToTab(tabId, { action: 'EXTRACT_MARKDOWN', options }, 5, 100);
        }

        if (response && response.status === 'success') {
          logger.info(
            'Background',
            'Clipping tab successful. Downloading:',
            response.data.filename,
          );
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
        let response = await sendMessageToTab(
          tabId,
          { action: 'EXTRACT_MARKDOWN', options },
          1,
          50,
        );

        if (!response) {
          await browser.scripting.executeScript({
            target: { tabId },
            files: ['content-scripts/content.js'],
          });
          response = await sendMessageToTab(tabId, { action: 'EXTRACT_MARKDOWN', options }, 5, 100);
        }

        if (response && response.status === 'success') {
          logger.info('Background', 'Copying markdown to clipboard...');
          await sendMessageToTab(
            tabId,
            {
              action: 'COPY_TO_CLIPBOARD',
              text: response.data.markdown,
            },
            2,
            50,
          );
        }
      } catch (err) {
        logger.error('Background', 'Error copying tab to clipboard:', err);
      }
    }

    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'TRANSFER_CHAT') {
        const target = request.targetPlatform;

        const uriAppTargets = ['obsidian', 'logseq', 'bear', 'noteplan', 'drafts'];
        if (uriAppTargets.includes(target)) {
          (async () => {
            try {
              const syncData = await browser.storage.sync.get('obsidianVault');
              const vault = syncData.obsidianVault || '';
              const title = request.title || 'Clipped Article';
              const content = request.payload || '';

              const cleanTitle =
                title
                  .replace(/[#|^[\]]/g, '')
                  .replace(/[/\\?%*:|"<>]/g, '')
                  .trim()
                  .slice(0, 245) || 'Clipped Article';

              let appUri = '';
              if (target === 'obsidian') {
                const params = new URLSearchParams();
                params.append('name', cleanTitle);
                if (vault && vault.trim().length > 0) params.append('vault', vault.trim());
                if (content) params.append('content', content);
                appUri = `obsidian://new?${params.toString()}`;
              } else if (target === 'logseq') {
                const params = new URLSearchParams();
                params.append('page', cleanTitle);
                if (content) params.append('content', content);
                appUri = `logseq://x-callback-url/quickCapture?${params.toString()}`;
              } else if (target === 'bear') {
                const params = new URLSearchParams();
                params.append('title', cleanTitle);
                if (content) params.append('text', content);
                appUri = `bear://x-callback-url/create?${params.toString()}`;
              } else if (target === 'noteplan') {
                const params = new URLSearchParams();
                params.append('noteTitle', cleanTitle);
                if (content) params.append('text', content);
                appUri = `noteplan://x-callback-url/addText?${params.toString()}`;
              } else if (target === 'drafts') {
                const params = new URLSearchParams();
                const fullText = cleanTitle ? `# ${cleanTitle}\n\n${content}` : content;
                params.append('text', fullText);
                appUri = `drafts://x-callback-url/create?${params.toString()}`;
              }

              await browser.tabs.create({ url: appUri });
              sendResponse({ success: true, uri: appUri });
            } catch (e) {
              logger.error('Background', `${target} transfer failed:`, e);
              sendResponse({ success: false, error: e.message });
            }
          })();
          return true;
        }

        const url = getAiPlatformUrl(target);

        (async () => {
          try {
            await browser.storage.local.set({
              pendingContinuation: {
                payload: request.payload,
                targetPlatform: target,
                timestamp: Date.now(),
              },
            });

            await browser.tabs.create({ url });
            sendResponse({ success: true });
          } catch (e) {
            logger.error('Background', 'Transfer failed:', e);
            sendResponse({ success: false, error: e.message });
          }
        })();
        return true;
      }
    });

    async function sendMessageToTab(tabId, message, maxRetries = 0, retryDelay = 100) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await new Promise((resolve) => {
          browser.tabs.sendMessage(tabId, message, (response) => {
            if (browser.runtime.lastError) {
              if (attempt === maxRetries) {
                logger.warn(
                  'Background',
                  'sendMessage lastError:',
                  browser.runtime.lastError.message,
                );
              }
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

    function downloadMarkdown(filename, content) {
      const blobUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(content);
      browser.downloads.download({
        url: blobUrl,
        filename: filename,
        saveAs: false,
      });
    }
  },
});
