# Privacy Policy — Decant 🍷

---

## 1. 100% On-Device & Client-Side Operation

**Decant** is built with a strict privacy-first architecture. All DOM extraction, article parsing (via Mozilla Readability), and Markdown conversion happen 100% locally inside your browser context. No content ever leaves your device.

## 2. Zero Data Collection & Zero Telemetry

Decant does **NOT** collect, store, transmit, or monetize any user data, browsing history, clipped articles, or settings. There are no tracking scripts, telemetry endpoints, or analytics services embedded in the extension.

## 3. Permissions Overview

Decant requests the minimum WebExtension permissions required to perform its core functions:

| Permission                        | Why it's needed                                                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab` / `scripting`         | Inject the content script to extract article content when you trigger a clip action                                                 |
| `storage`                         | Save your local extension preferences (frontmatter template, Markdown format, AI/app target) in your browser — never on any server  |
| `downloads`                       | Save `.md` files directly to your device                                                                                            |
| `clipboardWrite`                  | Copy Markdown to your clipboard                                                                                                     |
| `contextMenus`                    | Add right-click "Decant page/selection to Markdown" menu items                                                                      |
| `host_permissions` (`<all_urls>`) | Required to run the content script on any page you choose to clip — Decant only activates when you click the icon or use a shortcut |

## 4. Open Source Transparency

Decant is 100% open source under the **AGPL-3.0 License**. The full source code is publicly auditable at <https://github.com/Rat-S/decant>.

The privacy policy itself is part of the source repository, so any changes are visible in the commit history.

---

_Questions? Open an issue at <https://github.com/Rat-S/decant/issues>_
