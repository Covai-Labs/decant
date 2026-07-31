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
