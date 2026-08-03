/**
 * exporters.js — client-side format converters for Decant.
 *
 * Each named export (except openPrintDialog) accepts an ArticleData object and
 * returns { blob, ext } ready to hand off to chrome.downloads.download().
 *
 * @typedef {Object} ArticleData
 * @property {string}  title
 * @property {string}  markdown      - full formatted Markdown (may include frontmatter)
 * @property {string}  htmlContent   - Readability-cleaned HTML body
 * @property {string}  url
 * @property {string}  byline
 * @property {string}  siteName
 * @property {string}  excerpt
 * @property {string}  publishedTime - ISO date string or ''
 * @property {string}  baseFilename  - sanitized title, no extension
 */

// ─── Markdown ────────────────────────────────────────────────────────────────

export function toMarkdown(data) {
  return {
    blob: new Blob([data.markdown], { type: 'text/markdown;charset=utf-8' }),
    ext: 'md',
  };
}

// ─── HTML ────────────────────────────────────────────────────────────────────

export function toHtml(data) {
  const clippedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const metaParts = [];
  if (data.byline) metaParts.push(`By ${esc(data.byline)}`);
  if (data.siteName) metaParts.push(esc(data.siteName));
  if (data.publishedTime) {
    const d = new Date(data.publishedTime);
    if (!isNaN(d)) {
      metaParts.push(
        `Published ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      );
    }
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(data.title)}</title>
  <style>
    :root {
      --bg: #ffffff; --text: #1a202c; --muted: #718096;
      --border: #e2e8f0; --link: #4f46e5; --code-bg: #f7fafc;
      --max-w: 740px;
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #0f172a; --text: #f1f5f9; --muted: #94a3b8;
              --border: #1e293b; --link: #818cf8; --code-bg: #1e293b; }
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { font-size: 18px; line-height: 1.7; }
    body { background: var(--bg); color: var(--text); font-family: var(--font-sans);
           margin: 0; padding: 2rem 1rem 4rem; }
    article { max-width: var(--max-w); margin: 0 auto; }
    header { border-bottom: 1px solid var(--border); padding-bottom: 1.25rem; margin-bottom: 2rem; }
    h1 { font-size: 1.9rem; line-height: 1.25; margin: 0 0 0.75rem; }
    .meta { color: var(--muted); font-size: 0.85rem; margin: 0.25rem 0; }
    .source a { color: var(--link); font-size: 0.85rem; text-decoration: none; }
    .source a:hover { text-decoration: underline; }
    h2 { font-size: 1.4rem; margin-top: 2rem; }
    h3 { font-size: 1.15rem; margin-top: 1.5rem; }
    p { margin: 0 0 1rem; }
    a { color: var(--link); }
    code { font-family: var(--font-mono); font-size: 0.85em;
           background: var(--code-bg); border-radius: 4px; padding: 0.15em 0.4em; }
    pre { background: var(--code-bg); border-radius: 6px; padding: 1rem;
          overflow-x: auto; font-size: 0.85rem; border: 1px solid var(--border); }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 3px solid var(--border); margin: 1rem 0;
                 padding: 0.25rem 1rem; color: var(--muted); }
    img { max-width: 100%; height: auto; border-radius: 6px; }
    table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
    th, td { border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left; }
    th { background: var(--code-bg); font-weight: 600; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border);
             font-size: 0.8rem; color: var(--muted); }
    footer a { color: var(--muted); }
  </style>
</head>
<body>
  <article>
    <header>
      <h1>${esc(data.title)}</h1>
      ${metaParts.length ? `<p class="meta">${metaParts.join(' &middot; ')}</p>` : ''}
      ${data.url ? `<p class="source"><a href="${esc(data.url)}" target="_blank" rel="noopener noreferrer">View original source &rarr;</a></p>` : ''}
    </header>
    <div class="content">
      ${data.htmlContent}
    </div>
    <footer>
      <p>Clipped on ${clippedAt} with <a href="https://decant.covai.org" target="_blank" rel="noopener noreferrer">Decant</a></p>
    </footer>
  </article>
</body>
</html>`;

  return {
    blob: new Blob([html], { type: 'text/html;charset=utf-8' }),
    ext: 'html',
  };
}

// ─── JSON ────────────────────────────────────────────────────────────────────

export function toJson(data) {
  const obj = {
    title: data.title || null,
    url: data.url || null,
    byline: data.byline || null,
    siteName: data.siteName || null,
    excerpt: data.excerpt || null,
    publishedTime: data.publishedTime || null,
    clippedAt: new Date().toISOString(),
    content: data.markdown,
  };
  return {
    blob: new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' }),
    ext: 'json',
  };
}

// ─── Word Doc (.doc) ─────────────────────────────────────────────────────────

export function toDoc(data) {
  // Word/LibreOffice opens HTML files saved with a .doc extension + UTF-8 BOM.
  // Same technique used in ai-chat-exporter.
  const wordHtml = `<html
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w="urn:schemas-microsoft-com:office:word"
  xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
  <title>${esc(data.title)}</title>
  <!--[if gte mso 9]>
  <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a202c; }
    h1 { font-size: 20pt; } h2 { font-size: 15pt; } h3 { font-size: 13pt; }
    p  { margin: 0 0 8pt; }
    .meta { color: #666; font-size: 9pt; }
    code { font-family: "Courier New", monospace; font-size: 9.5pt; background: #f5f5f5; }
    pre  { font-family: "Courier New", monospace; font-size: 9pt;
           background: #f5f5f5; padding: 8pt; border: 1pt solid #e2e8f0; }
    blockquote { border-left: 3pt solid #e2e8f0; margin-left: 0;
                 padding-left: 12pt; color: #555; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1pt solid #e2e8f0; padding: 4pt 6pt; }
    th { background: #f8fafc; font-weight: bold; }
    .footer { color: #999; font-size: 8.5pt; margin-top: 16pt;
              border-top: 1pt solid #e2e8f0; padding-top: 8pt; }
  </style>
</head>
<body>
  <h1>${esc(data.title)}</h1>
  ${data.byline ? `<p class="meta">By ${esc(data.byline)}</p>` : ''}
  ${data.siteName ? `<p class="meta">${esc(data.siteName)}</p>` : ''}
  ${data.url ? `<p class="meta">Source: ${esc(data.url)}</p>` : ''}
  <hr />
  ${data.htmlContent}
  <div class="footer">
    <p>Clipped with Decant &mdash; https://decant.covai.org</p>
  </div>
</body>
</html>`;

  return {
    blob: new Blob(['\uFEFF', wordHtml], { type: 'application/msword;charset=utf-8' }),
    ext: 'doc',
  };
}

// ─── PDF (print dialog) ───────────────────────────────────────────────────────

/**
 * Opens the article as a styled tab and triggers the OS print dialog so
 * the user can choose "Save as PDF".
 *
 * @param {ArticleData} data
 */
export function openPrintDialog(data) {
  const { blob } = toHtml(data);
  const url = URL.createObjectURL(blob);

  chrome.tabs.create({ url }, (tab) => {
    // Inject a one-shot script that calls window.print() after the page loads.
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (document.readyState === 'complete') {
          window.print();
        } else {
          window.addEventListener('load', () => window.print(), { once: true });
        }
      },
    });
  });
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
