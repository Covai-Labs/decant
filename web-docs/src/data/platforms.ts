// Verified against ai/index.js exports and parser source (Sep 2026).

export interface PlatformEntry {
  platform: string;
  parser: string;
  module: string;
  strategy:
    | 'DOM'
    | 'DOM + internal API'
    | 'DOM + batchexecute RPC'
    | 'DOM + internal API + React fiber'
    | 'Internal API + DOM'
    | 'Readability + Defuddle + Article-Extractor';
  notes: string;
}

export const PLATFORMS: PlatformEntry[] = [
  {
    platform: 'ChatGPT',
    parser: 'ChatGPTParser',
    module: 'decant-core/ai/chatgpt',
    strategy: 'DOM + internal API',
    notes: 'Fallback and RPC-assisted extraction; scroll/dedup helper for long threads.',
  },
  {
    platform: 'Claude',
    parser: 'ClaudeParser',
    module: 'decant-core/ai/claude',
    strategy: 'DOM + internal API + React fiber',
    notes: 'Internal API first with DOM fallback; reads the React tree for artifacts and structured blocks.',
  },
  {
    platform: 'Google Gemini',
    parser: 'GeminiParser',
    module: 'decant-core/ai/gemini',
    strategy: 'DOM + batchexecute RPC',
    notes: 'Uses batchexecute RPC pagination with resilient DOM fallback.',
  },
  {
    platform: 'Microsoft Copilot',
    parser: 'CopilotParser',
    module: 'decant-core/ai/copilot',
    strategy: 'DOM',
    notes: 'Multi-domain (bing + copilot) DOM extraction.',
  },
  {
    platform: 'Perplexity',
    parser: 'PerplexityParser',
    module: 'decant-core/ai/perplexity',
    strategy: 'Internal API + DOM',
    notes: 'Internal API first, DOM fallback for source citations and answers.',
  },
  {
    platform: 'DeepSeek',
    parser: 'DeepSeekParser',
    module: 'decant-core/ai/deepseek',
    strategy: 'DOM + internal API',
    notes: 'API-assisted parsing (fragments[]) with DOM fallback.',
  },
  {
    platform: 'Qwen',
    parser: 'QwenParser',
    module: 'decant-core/ai/qwen',
    strategy: 'DOM',
    notes: 'Structured DOM extraction incl. file attachments.',
  },
  {
    platform: 'Meta AI',
    parser: 'MetaParser',
    module: 'decant-core/ai/meta',
    strategy: 'Internal API + DOM',
    notes: 'Internal GraphQL API (pinned + auto-resolved doc_ids) with DOM fallback.',
  },
  {
    platform: 'Mistral / Le Chat',
    parser: 'MistralParser',
    module: 'decant-core/ai/mistral',
    strategy: 'DOM',
    notes: 'DOM extraction.',
  },
  {
    platform: 'Proton Lumo',
    parser: 'LumoParser',
    module: 'decant-core/ai/lumo',
    strategy: 'DOM',
    notes: 'DOM only — API responses are E2E-encrypted and not readable.',
  },
  {
    platform: 'Z.ai',
    parser: 'ZAiParser',
    module: 'decant-core/ai/z_ai',
    strategy: 'Internal API + DOM',
    notes: 'Internal API (chat skeleton + batched bodies) with DOM fallback.',
  },
  {
    platform: 'Grok',
    parser: 'GrokParser',
    module: 'decant-core/ai/grok',
    strategy: 'Internal API + DOM',
    notes: 'Internal API (response-node ordering + load-responses bodies) with DOM fallback.',
  },
  {
    platform: 'Google AI Studio',
    parser: 'GoogleAIStudioParser',
    module: 'decant-core/ai/google_ai_studio',
    strategy: 'DOM',
    notes: 'DOM extraction for aistudio.google.com sessions.',
  },
  {
    platform: 'NotebookLM',
    parser: 'NotebookLMParser',
    module: 'decant-core/ai/notebooklm',
    strategy: 'DOM',
    notes: 'DOM extraction incl. notes and citations.',
  },
  {
    platform: 'Google Search AI (AI Overviews)',
    parser: 'GoogleSearchAIParser',
    module: 'decant-core/ai/google_search_ai',
    strategy: 'DOM',
    notes: 'DOM extraction for SGE overviews.',
  },
  {
    platform: 'Gemini Cloud Assist',
    parser: 'GeminiCloudAssistParser',
    module: 'decant-core/ai/gemini_cloud_assist',
    strategy: 'DOM',
    notes: 'DOM extraction for console.cloud.google.com assistants.',
  },
  {
    platform: 'Joyland',
    parser: 'JoylandParser',
    module: 'decant-core/ai/joyland',
    strategy: 'DOM',
    notes: 'DOM extraction for character chat platforms.',
  },
  {
    platform: 'Chub',
    parser: 'ChubParser',
    module: 'decant-core/ai/chub',
    strategy: 'DOM',
    notes: 'DOM extraction.',
  },
  {
    platform: 'Any web article',
    parser: 'ArticleParser',
    module: 'decant-core/article',
    strategy: 'Readability + Defuddle + Article-Extractor',
    notes: 'Runs three extractors concurrently and arbitrates by content-quality scoring.',
  },
];
