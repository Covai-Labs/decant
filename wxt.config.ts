import { defineConfig } from 'wxt';
import path from 'node:path';

export default defineConfig({
  manifestVersion: 3,
  modules: [],
  manifest: ({ browser }) => ({
    default_locale: 'en',
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    version: '1.5.0',
    homepage_url: 'https://decant.covai.org/',
    permissions:
      browser === 'firefox'
        ? ['activeTab', 'scripting', 'storage', 'contextMenus', 'clipboardWrite']
        : ['activeTab', 'scripting', 'storage', 'contextMenus', 'sidePanel', 'clipboardWrite'],
    host_permissions: ['<all_urls>'],
    web_accessible_resources: [
      {
        resources: ['content/chatgpt_helper.js', 'content/claude_react_reader.js'],
        matches: ['<all_urls>'],
      },
    ],
    action: {
      default_title: '__MSG_actionTitle__',
      default_icon: {
        '16': 'icons/icon16.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png',
      },
    },
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Alt+Shift+M',
        },
        description: '__MSG_cmdOpenPopup__',
      },
      clip_tab_as_markdown: {
        suggested_key: {
          default: 'Alt+Shift+D',
        },
        description: '__MSG_cmdClipTab__',
      },
      copy_tab_as_markdown: {
        suggested_key: {
          default: 'Alt+Shift+C',
        },
        description: '__MSG_cmdCopyTab__',
      },
    },
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'decant@covai.org',
              strict_min_version: '142.0',
              data_collection_permissions: {
                required: ['none'],
              },
            },
          },
        }
      : {}),
  }),
  vite: () => ({
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    optimizeDeps: {
      include: ['turndown', 'turndown-plugin-gfm'],
    },
  }),
});
