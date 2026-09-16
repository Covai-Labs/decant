# decant-core — Development Guide

Guide to building, testing, and extending `decant-core`. For contribution etiquette (PR guidelines,
CLA), see [CONTRIBUTING.md](CONTRIBUTING.md). For the platform matrix, see
[SUPPORTED_PLATFORMS.md](SUPPORTED_PLATFORMS.md).

## Prerequisites

- **Node.js 18+** with npm

## Setup

```bash
git clone https://github.com/Covai-Labs/decant.git
cd decant-core
npm install
```

## Commands

```bash
npm run test         # node --test (parser tests, fixture-based)
npm run lint         # ESLint
npm run format:check # Prettier
npm run format       # Prettier (write)
```

All three checks run in CI on every push and pull request.

## Project Layout

```
├── ai/                 # AI chat platform parsers (one module per platform)
├── article/            # Web article extraction (Readability + Defuddle + Article-Extractor)
├── detection/          # detectPlatform(), isAiChatUrl(), parser/domain registry
├── web/                # Web-scraping helpers and extraction utilities
├── tests/fixtures/     # Captured DOM snapshots the parsers are tested against
└── web-docs/           # Developer docs site (Astro, deploys to docs/ for GH Pages)
```

## Architecture

- **Parsers** live in `ai/`, one module per platform, each exporting a class that extends the base
  [`ChatParser`](ai/base.js). The base contract is `isAvailable(url)` returning a boolean and an
  async `parse()` returning a normalized result (title, model, messages, metadata).
- **Registration** is centralized in two places — `detection/detect-platform.js` for URL/domain
  detection and the `ai/index.js` barrel for named exports. A new platform must be registered in
  both (plus the shared `AI_CHAT_DOMAINS` list if it has its own domain).
- **Tests** are fixture-based: a captured HTML snapshot in `tests/fixtures/` plus a
  `tests/<platform>.test.mjs` that runs the parser against it. Runtime mocking is preferred over
  hand-written DOM strings so a platform's real markup is what the parser learns from.
- **Markdown/LaTeX helpers** (`convertToMarkdown`, `normalizeLatexMath`, `cleanMarkdown`) are
  deliberately platform-agnostic and keep math and GFM tables intact for Obsidian/Logseq round-trips.

## Adding or repairing a parser

This is the most common contribution. When an AI interface updates its DOM or you want to add a new
platform:

1. Capture a fresh DOM snapshot and save it to `tests/fixtures/`.
2. Add (or update) the parser in `ai/`, keeping the `isAvailable(url)` / `parse()` contract.
3. Register it in `detection/detect-platform.js`, `ai/index.js`, and (if applicable) the domain list.
4. Add a matching parser test in `tests/`.
5. Run `npm run lint && npm run format:check && npm test` before committing.

Follow the PR and CLA guidance in [CONTRIBUTING.md](CONTRIBUTING.md).
