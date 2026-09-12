// Shared site-wide constants and landing-page content.

export const SITE = {
  name: 'Decant',
  url: 'https://decant.covai.org',
  github: 'https://github.com/Covai-Labs/decant',
  chromeStore: '#',
  firefoxAddons: '#',
};

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    operatingSystem: 'Chrome, Firefox, Edge',
    applicationCategory: 'UtilitiesApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: SITE.url,
    downloadUrl: SITE.github,
  };
}

export const FEATURES = [
  {
    icon: '🗂️',
    tag: 'Alt+Shift+A',
    title: 'Multi-tab batch clipper',
    body: 'Ingest every open research tab into a single organized ZIP archive of structured Markdown files.',
  },
  {
    icon: '🔄',
    tag: '1-click',
    title: 'PKM note hand-off',
    body: 'Send clipped pages straight into Obsidian, Logseq, Bear, NotePlan, or Drafts with custom frontmatter.',
  },
  {
    icon: '👁️',
    tag: 'Reader view',
    title: 'Live preview studio',
    body: 'Review decanted content with KaTeX math and Prism code highlighting across dark, light, and solarized themes.',
  },
  {
    icon: '🧮',
    tag: 'Math & code',
    title: 'LaTeX that survives',
    body: 'Equations and code blocks stay intact — the Markdown works in Obsidian, Logseq, Notion, and your AI tools.',
  },
  {
    icon: '📄',
    tag: 'MD · HTML · DOC · JSON',
    title: 'Formats you own',
    body: 'Download Markdown, self-contained HTML, Word-compatible documents, or structured JSON.',
  },
  {
    icon: '🔒',
    tag: 'Zero telemetry',
    title: 'Strictly local',
    body: 'Mozilla Readability runs on-device. Clipped pages never leave your browser or touch a server.',
  },
];

export const INTEGRATIONS = [
  'Obsidian',
  'Logseq',
  'Notion',
  'Bear',
  'Drafts',
  'NotePlan',
  'ChatGPT',
  'Claude',
  'Gemini',
  'Joplin',
];

export const FAQ_ITEMS = [
  {
    q: 'How is Decant different from Firefox’s / Safari’s built-in Reader Mode?',
    a: 'Reader Mode reformats for reading but does not give you the content. Decant extracts the article into clean, reusable Markdown and hands it to your note-taking app, clipboard, or downloads.',
  },
  {
    q: 'How does Decant compare to MarkDownload or MarkDownload forks?',
    a: 'Decant adds multi-tab batch clipping to ZIP, one-click PKM URI hand-off with frontmatter, a preview studio with math and code highlighting, and multiple export formats — all behind the same zero-telemetry, local-only architecture.',
  },
  {
    q: 'How is Decant different from SingleFile?',
    a: 'SingleFile preserves a pixel-faithful snapshot by inlining the whole page. Decant is the opposite by design: it strips the chrome and exports the extractable content as structured Markdown you can reuse, tag, and search.',
  },
  {
    q: 'Does Decant send my clipped pages anywhere?',
    a: 'No. Extraction runs entirely in your browser via local Mozilla Readability. Nothing you clip is uploaded; the extension requests only the permissions it needs to read, copy, download, and hand content to local apps.',
  },
  {
    q: 'Which browsers are supported?',
    a: 'Decant is a Manifest V3 extension built with WXT, available for Chrome, Edge, Brave, and Firefox.',
  },
];
