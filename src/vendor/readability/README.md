# Vendored @mozilla/readability

This is a vendored copy of [mozilla/readability](https://github.com/mozilla/readability),
used for article extraction in Decant's content script.

## Vendored Version

- **Upstream commit:** `ab4027a`
- **Date:** 2026-08-17
- **Source:** https://github.com/mozilla/readability
- **License:** Apache-2.0 (see LICENSE.md) / MPL-2.0 (JSDOMParser.js, not included)

## Why Vendored?

Mozilla has not published a new npm release since 0.6.0 (Mar 2025). The
vendored copy includes unreleased fixes and improvements such as MathJax
support, improved paragraph wrapping, em/en dash title handling, and Bilibili
video embeds.

## What's Included

- `Readability.cjs` — core content extraction engine (renamed from `.js` to `.cjs` for ESM compatibility, since decant's `package.json` uses `"type": "module"`)
- `index.js` — ESM bridge (`export { Readability }`)
- `LICENSE.md` — Apache-2.0 license
- `NOTICE` — required attribution file

`JSDOMParser.js` is not included because Decant operates on real browser DOM
(via `document.cloneNode(true)`), not parsed HTML strings.

## Updating

To update to a newer upstream version:

1. Clone or fetch the latest from https://github.com/mozilla/readability
2. Copy the new `Readability.js` into this directory as `Readability.cjs`
3. Update the commit hash, date, and notes in this README
4. Verify the build: `npm run build && npm run build:firefox`
5. Test extraction on a few articles to confirm no regressions
