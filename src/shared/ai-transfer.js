/**
 * Utility for handing off decanted Markdown content to AI chat platforms
 * Supports ChatGPT, Claude, Gemini, DeepSeek, and Perplexity
 */

export const AI_PLATFORMS = {
  chatgpt: { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  claude: { name: 'Claude', url: 'https://claude.ai/new' },
  gemini: { name: 'Gemini', url: 'https://gemini.google.com/app' },
  deepseek: { name: 'DeepSeek', url: 'https://chat.deepseek.com/' },
  perplexity: { name: 'Perplexity', url: 'https://www.perplexity.ai/' },
};

export function buildAiPrompt({ title, url, content, template }) {
  if (template && template.trim().length > 0) {
    return template
      .replace(/\{\{title\}\}/g, title || '')
      .replace(/\{\{url\}\}/g, url || '')
      .replace(/\{\{content\}\}/g, content || '');
  }

  return `Please analyze and summarize the key takeaways from this web article:\n\nTitle: ${title || 'Untitled'}\nSource: ${url || ''}\n\n${content || ''}`;
}

export function getAiPlatformUrl(target = 'chatgpt') {
  return AI_PLATFORMS[target]?.url || AI_PLATFORMS.chatgpt.url;
}
