/**
 * Helper to detect AI Chat domains for suggesting AI Chat Exporter
 */

export const AI_CHAT_DOMAINS = [
  'chatgpt.com',
  'claude.ai',
  'gemini.google.com',
  'chat.deepseek.com',
  'perplexity.ai',
  'chat.qwen.ai',
  'qwen.ai',
  'chat.mistral.ai',
  'copilot.microsoft.com',
  'lumo.proton.me',
  'meta.ai',
  'aistudio.google.com',
  'notebooklm.google.com',
];

export function isAiChatUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return AI_CHAT_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
