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

Decant uses [WXT](https://wxt.dev) (v0.21) as its build framework, powered by Vite under the hood.

```bash
# Dev server with hot reload (Chrome)
npm run dev

# Dev server (Firefox)
npm run dev -b firefox

# Production build (Chrome, outputs to .output/chrome-mv3/)
npm run build

# Production build (Firefox, outputs to .output/firefox-mv3/)
npm run build:firefox
```

## Package for Store Submission

Produces release-ready `.zip` files in `releases/`:

```bash
npm run package
```

This runs both browser builds then calls `package.py` to create:

- `releases/decant-chromium.zip` — Chrome / Edge
- `releases/decant-firefox.zip` — Firefox AMO
- `releases/decant-source.zip` — Source code (required by AMO)

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
3. Click **Load unpacked** → select the `.output/chrome-mv3/` folder

**Firefox:**

1. Run `npm run build:firefox`
2. Go to `about:debugging` → This Firefox → Load Temporary Add-on
3. Select `.output/firefox-mv3/manifest.json`

## Project Structure

```
decant/
├── entrypoints/          # WXT entrypoints
│   ├── background/       # Service worker (background/index.js)
│   ├── content.js        # Content script — article extraction
│   ├── popup/            # Toolbar popup UI (index.html + main.js + popup.css)
│   ├── options/          # Settings/options page
│   ├── sidepanel/        # Chrome side panel UI (Chrome only, excluded for Firefox)
│   └── preview/          # Export preview page (unlisted, opens in new tab)
├── src/
│   ├── shared/           # Shared modules (storage, i18n, logger, formatter, exporters, AI/URI transfer)
│   └── vendor/           # Vendored libraries (Readability)
├── public/               # Static assets copied to build output
│   ├── icons/            # Extension icons (16, 48, 128px)
│   ├── _locales/         # i18n translation files
│   └── preview/lib/      # Vendored preview libs (KaTeX, PrismJS, html2canvas)
├── tests/                # Unit tests (Node built-in test runner)
├── wxt.config.ts         # WXT configuration (manifest, Vite config)
├── package.py            # ZIP packaging script for store submission
├── eslint.config.js      # ESLint flat config
└── .prettierrc           # Prettier config
```

## Build Output

```
.output/
├── chrome-mv3/           # Chrome production build
└── firefox-mv3/          # Firefox production build
```

## Key Architectural Notes

- **WXT manifest config** (`wxt.config.ts`) is the single source of truth for the extension manifest. Browser-specific differences (sidePanel permission, background format, gecko settings) are handled via a manifest function that receives `{ browser }`.
- **Content extraction** uses a vendored copy of [@mozilla/readability](https://github.com/mozilla/readability) (the same engine as Firefox Reader View), located in `src/vendor/readability/`. See the vendor README for version details and update instructions.
- **Markdown conversion** uses [Turndown](https://github.com/mixmark-io/turndown) with the GFM plugin.
- **Sidepanel iframe approach** — popup and options pages are loaded inside the side panel via iframes. The sidepanel entrypoint is excluded from Firefox builds via `manifest.exclude` meta tag.
- **Custom i18n** — Decant uses its own i18n system (`src/shared/i18n.js`) rather than the WXT i18n module, with `_locales/` in `public/`.

For contribution guidelines and CLA, see [CONTRIBUTING.md](./CONTRIBUTING.md).
