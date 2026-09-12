<div align="center">

# Decant 🍷

**The distraction-free web clipper and research batcher.**

_Decant articles and web content into clean, structured Markdown, Word, HTML, and JSON — 100% locally with zero telemetry._

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-red.svg)](LICENSE)
[![GitHub](https://img.shields.io/github/stars/Covai-Labs/decant?logo=github&logoColor=white&color=yellow&label=Stars)](https://github.com/Covai-Labs/decant)
[![Made with WXT](https://img.shields.io/badge/WXT-0.21-ff90e8)](https://wxt.dev)

[Quick Install](#quick-install) • [Features](#key-features) • [Privacy](#privacy) • [Local Development](#local-development)

---

Built natively for **Manifest V3** with [WXT](https://wxt.dev). Available for Chrome, Firefox, Edge, and Brave.

</div>

---

## Why Decant?

Most clippers either send your browsed content to a third-party server for "AI extraction", or wrap your page in heavy single-file dumps you can't actually reuse.

Decant goes the other way: it turns any page into **clean, structured Markdown you own** — fast, locally, and with a single click of the icon or a shortcut.

Key differentiators:

- **Multi-Tab Batch Clipper (`Alt+Shift+A`)** — ingest every open research tab into a single clean ZIP of structured Markdown files.
- **1-Click PKM hand-off** — direct URL-scheme triggers for Obsidian, Logseq, Bear, NotePlan, and Drafts with customizable YAML frontmatter.
- **Strictly local extraction** — Mozilla Readability runs on-device; nothing your browser reads ever leaves your machine.

---

## Key Features

- 🗂️ **Multi-Tab Batch Clipper (`Alt+Shift+A`):** Clip all open tabs in the current window into one organized ZIP archive — individual Markdown files per tab. Ideal for research sessions, literature round-ups, and "save the whole reading list" moments.
- 📝 **Clean Markdown:** Extract articles and main content into clean, structured Markdown with proper headings, tables, code fences, and preserved links.
- 🔄 **1-Click PKM Note-taking Hand-off:** Send clipped content straight into **Obsidian** (`obsidian://new`), **Logseq**, **Bear**, **NotePlan**, or **Drafts** with customizable frontmatter (`title`, `date`, `url`, custom tags).
- 👁️ **Live Preview Studio & Reader View:** Preview the decanted result in a clean reading view with **KaTeX** math rendering and **Prism** syntax highlighting across Dark, Light, and Solarized themes — before you save.
- 📊 **Export Format Matrix:** Download as **Markdown (`.md`)**, **HTML (`.html`)**, **Word (`.doc`)**, or **JSON (`.json`)**, or copy to clipboard.
- ⚡ **Side Panel & Shortcuts:** Clip, copy, and preview from the native Chromium side panel, plus keyboard shortcuts — `Alt+Shift+C` copy, `Alt+Shift+D` download, `Alt+Shift+A` batch clip.
- 🖱️ **Right-click menus:** Decant the page or a text selection from the context menu.
- 🎨 **Custom Frontmatter & Formatting:** Configurable templates for metadata tags, page URLs, titles, and dates.
- 🔒 **100% Private & Local:** All parsing happens on-device in your browser. Zero tracking or telemetry. See [Privacy](#privacy).

---

## Quick Install

- **Chrome / Brave / Edge:** [Add to Chrome](https://chromewebstore.google.com) (keyword: _Decant — Privacy-First Web Clipper_) or load the unpacked build (`dist/`).
- **Firefox:** Load the temporary add-on from `dist-firefox/manifest.json` at `about:debugging#/runtime/this-firefox`.

> [!NOTE]
> Store listings are rolling out; if the store build isn't available in your region yet, the unpacked builds below work identically.

<details>
<summary><b>📦 Manual / Unpacked Installation</b></summary>

1. Run `npm run build` (Chrome) or `npm run build:firefox` (Firefox).
2. **Chrome/Edge/Brave:** open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `.output/chrome-mv3` (or repo `dist/`) folder.
3. **Firefox:** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**, and select `manifest.json` inside the built folder.

</details>

---

## Privacy

Decant is **strictly local by design** — the same philosophy as the on-device extraction it uses.

| Permission                | Why it's needed                                                            |
| :------------------------ | :------------------------------------------------------------------------- |
| `activeTab` / `scripting` | Inject the content script to extract the page only when you trigger a clip |
| `storage`                 | Save your local preferences (frontmatter template, format, app target)     |
| `downloads`               | Save `.md` files directly to your device                                   |
| `clipboardWrite`          | Copy Markdown to your clipboard                                            |
| `contextMenus`            | Add right-click "Decant to Markdown" menu items                            |

No third-party APIs. No analytics. No telemetry endpoints. No server round-trips — content only touches memory, the clipboard, your downloads folder, or your PKM app. Audit it yourself: [PRIVACY.md](PRIVACY.md) and the full [source](https://github.com/Covai-Labs/decant).

---

## Export Formats

| Format      | Extension | Use case                                       |
| :---------- | :-------- | :--------------------------------------------- |
| Markdown    | `.md`     | Obsidian, Logseq, editors, AI prompts          |
| HTML        | `.html`   | Self-contained article snapshot                |
| Word        | `.doc`    | Docs/drafting workflows                        |
| JSON        | `.json`   | Programmatic / archival pipelines              |
| ZIP (batch) | `.zip`    | All open tabs → one organized research archive |

---

## Local Development

```bash
npm install
npm run dev             # Start dev server (Chrome)
npm run dev -b firefox  # Dev server (Firefox)
npm run build           # Production build (Chrome)  -> .output/chrome-mv3
npm run build:firefox   # Production build (Firefox) -> .output/firefox-mv3
npm run test            # Unit tests
npm run lint            # ESLint
npm run format:check    # Prettier
```

## Project Structure

```
decant/
├── entrypoints/          # WXT entrypoints (background, content, popup, options, sidepanel, preview)
├── src/
│   ├── shared/           # Formatter, exporters (MD/HTML/DOC/JSON/ZIP), batch clipper, URI transfer
│   └── vendor/           # Vendored libraries (Readability)
├── public/               # Static assets (icons, _locales)
├── wxt.config.ts         # WXT configuration (manifest, commands, build hooks)
└── web/                  # Marketing site (Astro) -> ../docs for GitHub Pages
```

---

## Background

Decant started as a quick personal tool to extract web page content and chat with articles. When preparing it for extension stores, two things became clear:

1. **Privacy matters:** nobody wants an extension sending their browsed content to random third-party servers.
2. **Simplicity wins:** why force API keys or cloud middleman servers when you can extract crisp, clean Markdown locally and drop it into ChatGPT, Claude, your favorite AI chat, or your own notes?

While browsers ship increasingly built-in AI, Decant keeps things gloriously simple: fast, private, local extraction that gives you clean Markdown to use anywhere — no telemetry, no lock-in, no accounts.

---

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See [LICENSE](LICENSE) for details.

Acknowledgments: [decant-core](https://github.com/Covai-Labs/decant-core) — shared parsing engine; Mozilla Readability; Turndown + GFM; JSZip; WXT.
