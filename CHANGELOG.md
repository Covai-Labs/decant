# [1.7.0](https://github.com/Covai-Labs/decant-core/compare/v1.6.0...v1.7.0) (2026-09-13)


### Bug Fixes

* apply CodeRabbit auto-fixes ([d5896dc](https://github.com/Covai-Labs/decant-core/commit/d5896dc6946468ed9edf9f7d5df3daee723bd6d0))


### Features

* **web-docs:** add JobFoundry-style wave background ([b9a533a](https://github.com/Covai-Labs/decant-core/commit/b9a533a63350c80c37dc253708be3eac7d05f7a6))

# [1.6.0](https://github.com/Covai-Labs/decant-core/compare/v1.5.0...v1.6.0) (2026-09-12)


### Features

* **gemini:** add batchexecute RPC pagination and resilient candidate extraction with DOM fallback ([5f09682](https://github.com/Covai-Labs/decant-core/commit/5f096828cabf9cafd221a7563938c2271e65b0b9))
* **gemini:** enrich API messages with DOM attachments and add test coverage ([0365bb9](https://github.com/Covai-Labs/decant-core/commit/0365bb9e8980b879e82c351df3720a848c8973da))

# [1.5.0](https://github.com/Covai-Labs/decant-core/compare/v1.4.0...v1.5.0) (2026-09-12)


### Bug Fixes

* **chatgpt:** clean DOM webpage citation pills and support modern turn containers ([f24f481](https://github.com/Covai-Labs/decant-core/commit/f24f481a0359ecd9c52aae9abefbc33dabeb1894))
* **perplexity:** resolve account ID for authenticated thread API requests ([8aaa754](https://github.com/Covai-Labs/decant-core/commit/8aaa754a917cca4ae9eab6a3bc6fe010ca0dee17))
* **perplexity:** support modern user bubbles and extract message timestamps ([3451e18](https://github.com/Covai-Labs/decant-core/commit/3451e188b43c2cdc171a7558a1adffbbf80cec8c))


### Features

* **perplexity:** add REST API thread extraction with DOM fallback ([720b4ed](https://github.com/Covai-Labs/decant-core/commit/720b4ed539af4b3616d36a2127dbf2c5ce9fab74))

# [1.4.0](https://github.com/Covai-Labs/decant-core/compare/v1.3.1...v1.4.0) (2026-09-09)


### Features

* **claude:** support interactive elements, widgets, questionnaires, and unrolled carousels ([#7](https://github.com/Covai-Labs/decant-core/issues/7)) ([93baca7](https://github.com/Covai-Labs/decant-core/commit/93baca72364d3fc90eb0bd1a7cd3e78f2d4de594))

## [1.3.1](https://github.com/Covai-Labs/decant-core/compare/v1.3.0...v1.3.1) (2026-09-09)


### Bug Fixes

* **google-search-ai:** purge leaked sn._setImageSrc calls and stray data URIs ([#6](https://github.com/Covai-Labs/decant-core/issues/6)) ([0e250b2](https://github.com/Covai-Labs/decant-core/commit/0e250b2523862ee01f87ca32a909af11da198c61))

# [1.3.0](https://github.com/Covai-Labs/decant-core/compare/v1.2.6...v1.3.0) (2026-09-07)


### Features

* disable article extraction for content in subframes by checking window hierarchy ([a0032f6](https://github.com/Covai-Labs/decant-core/commit/a0032f68df60cc7b41238f13eff25150fcbf5368))
* improve ChatGPT math rendering and cleanup by supporting data-math-source and adding new noise filters. ([e3017e9](https://github.com/Covai-Labs/decant-core/commit/e3017e9d5c8865bedf7689ece681761c05746076))

## [1.2.6](https://github.com/Covai-Labs/decant-core/compare/v1.2.5...v1.2.6) (2026-09-07)


### Bug Fixes

* **google-search-ai:** preserve data-xpm-latex math equation images when stripping base64 images ([b293769](https://github.com/Covai-Labs/decant-core/commit/b293769df173df2fbd4e38c84aee1dc9a1b87949))

## [1.2.5](https://github.com/Covai-Labs/decant-core/compare/v1.2.4...v1.2.5) (2026-09-07)


### Bug Fixes

* katex rendering ([6584dbd](https://github.com/Covai-Labs/decant-core/commit/6584dbd00d599b1d2ae68334c1fb7739ca7d6ade))

## [1.2.4](https://github.com/Covai-Labs/decant-core/compare/v1.2.3...v1.2.4) (2026-09-06)

### Bug Fixes

- **google-search-ai:** sanitize scripts, base64 images and tracking links (Covai-Labs/ai-chat-exporter[#29](https://github.com/Covai-Labs/decant-core/issues/29)) ([f70bd42](https://github.com/Covai-Labs/decant-core/commit/f70bd42e76b163ec9b4ab2689ea0537531a7901d))

## [1.2.3](https://github.com/Covai-Labs/decant-core/compare/v1.2.2...v1.2.3) (2026-09-06)

### Bug Fixes

- preserve latex math without turndown escaping ([68dbdef](https://github.com/Covai-Labs/decant-core/commit/68dbdef00599625c4c9786f556805f810edea900))

## [1.2.2](https://github.com/Covai-Labs/decant-core/compare/v1.2.1...v1.2.2) (2026-09-01)

### Bug Fixes

- **gemini:** prioritize DOM extraction & validate API response content ([#1](https://github.com/Covai-Labs/decant-core/issues/1)) ([84ab6cb](https://github.com/Covai-Labs/decant-core/commit/84ab6cb01910c2cd5b2e45ae97ef7060fc597f8a))
- **gemini:** prioritize DOM parsing and validate API message content ([5b44011](https://github.com/Covai-Labs/decant-core/commit/5b44011390ec94bf17ee79307d2f5dfe09ff2b94))

## [1.2.1](https://github.com/Covai-Labs/decant-core/compare/v1.2.0...v1.2.1) (2026-08-31)

### Bug Fixes

- **gemini:** clean up console logs and simplify deep research extraction ([e8990a3](https://github.com/Covai-Labs/decant-core/commit/e8990a38c63f3ed92b2ba10ae1e3b92809f72de6))

# [1.2.0](https://github.com/Covai-Labs/decant-core/compare/v1.1.0...v1.2.0) (2026-08-25)

### Bug Fixes

- just prettier ([1cd3a36](https://github.com/Covai-Labs/decant-core/commit/1cd3a3620573f6a6d9462928939c12f9cab63a8d))

### Features

- standardize extraction method metadata across all AI parsers and add validation tests ([175a990](https://github.com/Covai-Labs/decant-core/commit/175a99065bd0016261a6b2dd98f0b97396dd10e0))

# [1.1.0](https://github.com/Covai-Labs/decant-core/compare/v1.0.1...v1.1.0) (2026-08-20)

### Features

- implement intelligent article extraction and web parsing using Readability, Defuddle, and Article-Extractor libraries. ([c24dc16](https://github.com/Covai-Labs/decant-core/commit/c24dc1650e3ac3c63b5fdf0760a009c5f2c298cb))

## [1.0.1](https://github.com/Covai-Labs/decant-core/compare/v1.0.0...v1.0.1) (2026-08-19)

### Bug Fixes

- **ci:** pass NPM_TOKEN to release workflow and format changelog ([9148fab](https://github.com/Covai-Labs/decant-core/commit/9148fabfb9f7ddd6ba2297be7ba3ea065559f0c9))

# 1.0.0 (2026-08-19)

### Bug Fixes

- **ci:** update node version to 22 for semantic-release ([c806c07](https://github.com/Covai-Labs/decant-core/commit/c806c07a1a671b2cebb2340d4b00d311f52842b1))

### Features

- migrate to semantic-release for automated versioning and package publishing ([c1910e8](https://github.com/Covai-Labs/decant-core/commit/c1910e807b7709c644e69ea853a15dd8b8f25916))
- shared @covai/parser-core package ([28c7998](https://github.com/Covai-Labs/decant-core/commit/28c7998551b87ac0256288fe3082ceaca8484e02))
- shared @covai/parser-core package ([eb4427e](https://github.com/Covai-Labs/decant-core/commit/eb4427ea3ad3638d7009b18d2db9fbf417806d10))
