import { isDuckAiUrl } from "../ai/duck_ai.js";

/**
 * AI chat platform domain definitions.
 * Centralised so detection logic and UI (e.g. Decant's tip banner) share the same list.
 */

const COPILOT_APP_HOSTS = [
  "copilot.cloud.microsoft",
  "m365.cloud.microsoft",
  "m365.microsoft.com",
  "onenote.cloud.microsoft",
  "word.cloud.microsoft",
  "excel.cloud.microsoft",
  "powerpoint.cloud.microsoft",
  "outlook.cloud.microsoft",
  "teams.cloud.microsoft",
  "loop.cloud.microsoft",
];

const COPILOT_CHAT_PATHS = ["/chat", "/projects"];

export function isCopilotUrl(url) {
  if (!url || typeof url !== "string") return false;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (COPILOT_APP_HOSTS.includes(host)) {
    return COPILOT_CHAT_PATHS.some(
      (path) => parsed.pathname === path || parsed.pathname.startsWith(`${path}/`),
    );
  }

  return (
    host === "copilot.microsoft.com" ||
    host === "copilot.com" ||
    (host === "bing.com" &&
      (parsed.pathname === "/chat" ||
        parsed.pathname.startsWith("/copilot") ||
        parsed.pathname === "/copilotsearch")) ||
    host === "edgeservices.bing.com"
  );
}

export const AI_CHAT_DOMAINS = [
  "chatgpt.com",
  "claude.ai",
  "gemini.google.com",
  "chat.deepseek.com",
  "perplexity.ai",
  "chat.qwen.ai",
  "qwen.ai",
  "chat.mistral.ai",
  "lumo.proton.me",
  "meta.ai",
  "aistudio.google.com",
  "notebooklm.google.com",
  "notebook.google.com",
  "chat.z.ai",
  "joyland.ai",
  "chub.ai",
  "characterhub.org",
  "grok.com",
  "duck.ai",
];

/**
 * Additional URL patterns that don't fit simple domain matching.
 * Each entry: { test: (url) => boolean, platform: string }
 */
export const URL_PATTERNS = [
  {
    test: isCopilotUrl,
    platform: "copilot",
  },
  {
    test: (url) => /google\.[a-z.]+\/search/.test(url),
    platform: "google-search-ai",
  },
  {
    test: (url) => url.includes("console.cloud.google.com/gemini"),
    platform: "gemini-cloud-assist",
  },
  {
    test: isDuckAiUrl,
    platform: "duck-ai",
  },
];
