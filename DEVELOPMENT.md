# Decant — Development Guide

This guide covers local setup, build system, testing, and project structure for the Decant browser extension.

## Prerequisites

- **Node.js 20+** — for building, linting, formatting, and running tests
- **Python 3.x** — for the packaging script (`package.py`)
- **npm** — comes with Node.js

## Setup

```bash
git clone https://github.com/Rat-S/decant.git
cd decant
npm install
```

## Build

Decant uses [esbuild](https://esbuild.github.io/) to bundle source files and a custom `build.js` script to assemble the extension.

```bash
# Build for Chrome / Edge (outputs to dist/)
npm run build

# Build for Firefox (outputs to dist-firefox/)
npm run build:firefox

# Watch mode (Chrome, auto-rebuilds on file changes)
npm run watch
```

## Package for Store Submission

Produces release-ready `.zip` files in `releases/`:

```bash
npm run package
```

This runs both browser builds then calls `package.py` to create:

- `releases/decant-chrome-v{version}.zip` — Chrome / Edge
- `releases/decant-firefox-v{version}.zip` — Firefox AMO
- `releases/decant-source-v{version}.zip` — Source code (required by AMO)

## Testing & Code Quality

```bash
# Run unit tests (Node built-in test runner)
npm test

# ESLint
npm run lint

# Prettier formatting check (read-only)
npm run format:check

# Prettier auto-fix
npm run format

# Run all checks (mirrors CI)
npm run lint && npm run format:check && npm test
```

All three checks run in CI on every push and pull request.

## Loading Locally in Your Browser

**Chrome / Edge:**

1. Run `npm run build`
2. Go to `chrome://extensions` → Enable Developer Mode
3. Click **Load unpacked** → select the `dist/` folder

**Firefox:**

1. Run `npm run build:firefox`
2. Go to `about:debugging` → This Firefox → Load Temporary Add-on
3. Select `dist-firefox/manifest.json`

## Project Structure

```
decant/
├── src/
│   ├── background/       # Service worker (background.js)
│   ├── content/          # Content script (content.js) — article extraction
│   ├── popup/            # Toolbar popup UI
│   ├── options/          # Settings/options page
│   ├── sidepanel/        # Chrome side panel UI (Chrome only)
│   ├── shared/           # Shared modules (storage, formatter, logger, AI/URI transfer)
│   ├── icons/            # Extension icons (16, 48, 128px)
│   └── manifest.json     # Source manifest (Chrome/Chromium)
├── tests/                # Unit tests (Node built-in test runner)
├── docs/                 # Extension website (decant.covai.org)
├── build.js              # esbuild + manifest processing script
├── package.py            # ZIP packaging script for store submission
├── eslint.config.js      # ESLint flat config
└── .prettierrc           # Prettier config
```

## Key Architectural Notes

- **Source manifest** (`src/manifest.json`) is the Chromium source of truth. Firefox-specific fields (`browser_specific_settings`, `data_collection_permissions`, background script format, sidepanel removal) are injected at build time by `build.js`.
- **Content extraction** uses a vendored copy of [@mozilla/readability](https://github.com/mozilla/readability) (the same engine as Firefox Reader View), located in `src/vendor/readability/`. See the vendor README for version details and update instructions.
- **Markdown conversion** uses [Turndown](https://github.com/mixmark-io/turndown) with the GFM plugin.
- **No bundler config file** — all esbuild options are defined inline in `build.js`.

For contribution guidelines and CLA, see [CONTRIBUTING.md](./CONTRIBUTING.md).
