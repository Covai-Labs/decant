# Decant 🍷

**Decant** is a fast, privacy-first, open-source browser extension that decants web content into clean, structured Markdown. Built natively for **Manifest V3**.

## Features

- 📄 **Web Clipper to Markdown:** Extract articles and main content into clean Markdown.
- 🔒 **100% Private & Local:** All parsing happens on-device in your browser. Zero tracking or telemetry.
- ⚡ **Manifest V3 Architecture:** Built with modern background service workers, content scripts, and side panel / popup interfaces.
- 🎨 **Custom Frontmatter & Formatting:** Configurable templates for metadata tags, page URLs, titles, and dates.
- 📝 **Obsidian / Logseq / Notion Ready:** Easy copying to clipboard or downloading as markdown files.

## Project Structure

```
decant/
├── .agents/            # Agent context & private local guidelines (gitignored)
├── Scratch/            # Discussion notes, drafts, and experiments (gitignored)
├── src/                # Manifest V3 extension source code
├── README.md           # Public overview & vision
└── LICENSE             # AGPL-3.0 License
```

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See the [LICENSE](file:///home/anu/Workspace/Public/Add-ons/decant/LICENSE) file for details.

## Background

Decant started as a quick personal tool to extract web page content, send it to a backend API, and chat with articles inside a popup. But when preparing to put it on extension stores, two things became clear:

1. **Privacy matters**: Nobody wants an extension sending their browsed content off to random third-party servers.
2. **Simplicity wins**: Why force API keys or cloud middleman servers when you can just extract crisp, clean Markdown locally and drop it into ChatGPT, Claude, or your favorite AI chat window?

While browsers have started bundling built-in AI tools, Decant keeps things delightfully simple: fast, privacy-first local extraction that gives you raw, clean Markdown to use anywhere you want without telemetry or lock-in.
