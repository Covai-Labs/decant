export const DEFAULT_OPTIONS = {
  includeFrontmatter: true,
  frontmatterTemplate: `---\ntitle: "{{title}}"\nsource: "{{url}}"\nauthor: "{{author}}"\npublished: {{published}}\nclipped: {{clipped}}\ntags:\n  - web-clip\n---`,
  headingStyle: 'atx', // 'atx' (#) or 'setext' (===)
  bulletListMarker: '-', // '-', '*', '+'
  codeBlockStyle: 'fenced', // 'fenced' or 'indented'
  fenceSymbol: '```',
  defaultAppTarget: 'obsidian', // 'obsidian', 'logseq', 'bear', 'noteplan', 'drafts'
  obsidianVault: '',
  defaultAiTarget: 'chatgpt', // 'chatgpt', 'claude', 'gemini', 'deepseek', 'perplexity'
  aiPromptTemplate:
    'Please analyze and summarize the key takeaways from this web article:\n\nTitle: {{title}}\nSource: {{url}}\n\n{{content}}',
  downloadImages: false,
  uiLanguage: 'auto',
};

export async function getOptions() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(DEFAULT_OPTIONS, (items) => {
        resolve({ ...DEFAULT_OPTIONS, ...items });
      });
    } else {
      resolve(DEFAULT_OPTIONS);
    }
  });
}

export async function saveOptions(options) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(options, () => {
        resolve(true);
      });
    } else {
      resolve(false);
    }
  });
}
