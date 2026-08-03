import { toMarkdown, toHtml, toJson, toDoc } from '../shared/exporters.js';

// ── State ────────────────────────────────────────────────────────
let articleData = null;
let activeTab = 'html-live';
let isDark = true;

// Cached generated content per format
const cache = {};

// ── DOM refs ─────────────────────────────────────────────────────
const articleTitle  = document.getElementById('article-title');
const sourceLink    = document.getElementById('source-link');
const htmlIframe    = document.getElementById('html-iframe');
const themeBtn      = document.getElementById('theme-btn');
const copyBtn       = document.getElementById('copy-btn');
const printBtn      = document.getElementById('print-btn');
const downloadBtn   = document.getElementById('download-btn');
const tabStrip      = document.getElementById('format-tabs');
const pngRenderBtn  = document.getElementById('png-render-btn');
const pngHqCheck    = document.getElementById('png-hq');
const pngOutput     = document.getElementById('png-output');

// ── Format metadata ───────────────────────────────────────────────
const FORMAT_META = {
  'html-live': { label: '⬇ Download .html', ext: 'html' },
  'markdown':  { label: '⬇ Download .md',   ext: 'md'   },
  'html-code': { label: '⬇ Download .html', ext: 'html' },
  'json':      { label: '⬇ Download .json', ext: 'json' },
  'doc':       { label: '⬇ Download .doc',  ext: 'doc'  },
  'png':       { label: '⬇ Download .png',  ext: 'png'  },
};

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  showLoading(true);

  const params = new URLSearchParams(location.search);
  const key = params.get('key');

  if (!key) {
    showError('No article data key found. Please re-clip the page from the Decant popup.');
    return;
  }

  try {
    const result = await new Promise((resolve, reject) => {
      chrome.storage.session.get(key, (data) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(data);
      });
    });

    articleData = result[key];
    if (!articleData) {
      showError('Article data expired or not found. Please re-clip the page.');
      return;
    }

    // Clean up session storage
    chrome.storage.session.remove(key);

    // Apply saved theme preference
    const prefs = await new Promise((r) => chrome.storage.local.get('previewTheme', r));
    setTheme(prefs.previewTheme === 'light' ? 'light' : 'dark');

    // Populate header
    document.title = `${articleData.title} — Decant Export`;
    articleTitle.textContent = articleData.title || 'Untitled';
    if (articleData.url) {
      sourceLink.href = articleData.url;
    }

    // Pre-generate format content
    buildCache();

    // Render first tab
    await renderTab('html-live');

    showLoading(false);
  } catch (err) {
    showError('Failed to load article: ' + err.message);
  }
}

// ── Cache generated content ───────────────────────────────────────
function buildCache() {
  cache.markdown = articleData.markdown;
  cache.htmlStr  = null; // generated lazily on first visit
  cache.docStr   = null; // generated lazily on first visit

  const jsonObj = {
    title:         articleData.title || null,
    url:           articleData.url || null,
    byline:        articleData.byline || null,
    siteName:      articleData.siteName || null,
    excerpt:       articleData.excerpt || null,
    publishedTime: articleData.publishedTime || null,
    clippedAt:     new Date().toISOString(),
    content:       articleData.markdown,
  };
  cache.jsonStr = JSON.stringify(jsonObj, null, 2);
}

// ── Render a tab ──────────────────────────────────────────────────
async function renderTab(tab) {
  switch (tab) {
    case 'html-live':
      await renderHtmlLive();
      break;
    case 'markdown':
      renderCode('code-markdown', articleData.markdown, 'language-markdown');
      break;
    case 'html-code': {
      if (!cache.htmlStr) {
        const text = await blobToText(toHtml(articleData).blob);
        cache.htmlStr = text;
      }
      renderCode('code-html', cache.htmlStr, 'language-html');
      break;
    }
    case 'json':
      renderCode('code-json', cache.jsonStr, 'language-json');
      break;
    case 'doc': {
      if (!cache.docStr) {
        const text = await blobToText(toDoc(articleData).blob);
        cache.docStr = text;
      }
      renderCode('code-doc', cache.docStr, 'language-html');
      break;
    }
    case 'png':
      // PNG is rendered on demand by the user
      break;
  }
}

// ── HTML Live rendering ───────────────────────────────────────────
async function renderHtmlLive() {
  const { blob } = toHtml(articleData);
  const text = await blobToText(blob);

  // Inject theme class and KaTeX/Prism scripts into the iframe srcdoc
  const iframeTheme = isDark ? 'dark' : 'light';

  // Build srcdoc: inject KaTeX + Prism from parent extension context
  const katexCssUrl   = chrome.runtime.getURL('preview/lib/katex/katex.min.css');
  const katexJsUrl    = chrome.runtime.getURL('preview/lib/katex/katex.min.js');
  const katexArUrl    = chrome.runtime.getURL('preview/lib/katex/auto-render.min.js');
  const prismCssUrl   = chrome.runtime.getURL('preview/lib/prismjs/prism-tomorrow.min.css');
  const prismJsUrl    = chrome.runtime.getURL('preview/lib/prismjs/prism-bundle.js');

  const injected = text.replace('</head>', `
  <link rel="stylesheet" href="${katexCssUrl}">
  <link rel="stylesheet" href="${prismCssUrl}">
  <script src="${katexJsUrl}"><\/script>
  <script src="${katexArUrl}"><\/script>
  <script src="${prismJsUrl}"><\/script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$',  right: '$',  display: false},
            {left: '\\\\[', right: '\\\\]', display: true},
            {left: '\\\\(', right: '\\\\)', display: false}
          ]
        });
      }
      if (window.Prism) Prism.highlightAll();
    });
  <\/script>
  </head>`).replace(
    '<html lang="en">',
    `<html lang="en" data-forced-theme="${iframeTheme}">`
  );

  htmlIframe.srcdoc = injected;
}

// ── Code view rendering ───────────────────────────────────────────
function renderCode(elId, content, langClass) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = content || '';
  el.className = langClass;
  if (window.Prism) Prism.highlightElement(el);
}

// ── PNG generation ────────────────────────────────────────────────
async function generatePng() {
  pngRenderBtn.disabled = true;
  pngRenderBtn.textContent = 'Rendering…';
  pngOutput.innerHTML = '<div class="png-hint">Rendering article to image…</div>';

  try {
    // Render in a hidden iframe for html2canvas
    const { blob } = toHtml(articleData);
    const text = await blobToText(blob);

    // Build a hidden div with the article HTML for html2canvas
    const container = document.createElement('div');
    container.style.cssText = [
      'position:fixed', 'top:-9999px', 'left:0',
      'width:900px', 'background:#ffffff', 'color:#1a202c',
      'padding:48px 64px', 'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      'font-size:18px', 'line-height:1.7'
    ].join(';');

    // Extract just the article body from the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    container.innerHTML = doc.querySelector('article')?.innerHTML || doc.body.innerHTML;
    document.body.appendChild(container);

    const scale = pngHqCheck.checked ? 2 : 1;
    const canvas = await window.html2canvas(container, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });

    document.body.removeChild(container);

    // Show preview image
    const dataUrl = canvas.toDataURL('image/png');
    pngOutput.innerHTML = '';

    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'PNG preview of article';
    pngOutput.appendChild(img);

    // Download button
    const dlBtn = document.createElement('button');
    dlBtn.id = 'png-download-btn';
    dlBtn.className = 'btn btn-primary';
    dlBtn.textContent = '⬇ Download PNG';
    dlBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${articleData.baseFilename || 'article'}.png`;
      a.click();
    });
    pngOutput.appendChild(dlBtn);

  } catch (err) {
    pngOutput.innerHTML = `<p class="png-hint" style="color:#f87171">PNG generation failed: ${err.message}</p>`;
  } finally {
    pngRenderBtn.disabled = false;
    pngRenderBtn.textContent = 'Regenerate';
  }
}

// ── Download ──────────────────────────────────────────────────────
async function triggerDownload() {
  if (!articleData) return;

  if (activeTab === 'png') {
    // Download handled inline in the PNG view
    const dlBtn = document.getElementById('png-download-btn');
    if (dlBtn) dlBtn.click();
    return;
  }

  let blob, ext;
  switch (activeTab) {
    case 'markdown':
      ({ blob, ext } = toMarkdown(articleData)); break;
    case 'html-live':
    case 'html-code':
      ({ blob, ext } = toHtml(articleData)); break;
    case 'json':
      ({ blob, ext } = toJson(articleData)); break;
    case 'doc':
      ({ blob, ext } = toDoc(articleData)); break;
    default:
      ({ blob, ext } = toHtml(articleData));
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${articleData.baseFilename || 'article'}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Copy ──────────────────────────────────────────────────────────
async function triggerCopy() {
  if (!articleData) return;

  let text = '';
  switch (activeTab) {
    case 'markdown':  text = articleData.markdown; break;
    case 'json':      text = cache.jsonStr; break;
    case 'html-live':
    case 'html-code': text = cache.htmlStr || await blobToText(toHtml(articleData).blob); break;
    case 'doc':       text = cache.docStr  || await blobToText(toDoc(articleData).blob); break;
    default:          text = articleData.markdown;
  }

  await navigator.clipboard.writeText(text);
  showToast('Copied!');
}

// ── Theme ─────────────────────────────────────────────────────────
function setTheme(theme) {
  isDark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  themeBtn.textContent = isDark ? '🌙' : '☀️';
  themeBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  chrome.storage.local.set({ previewTheme: theme });

  // Re-render iframe if active
  if (activeTab === 'html-live' && articleData) {
    renderHtmlLive();
  }
}

// ── Tab switching ─────────────────────────────────────────────────
async function switchTab(tab) {
  if (tab === activeTab) return;

  // Update tab buttons
  tabStrip.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
    btn.setAttribute('aria-selected', btn.dataset.tab === tab ? 'true' : 'false');
  });

  // Update views
  document.querySelectorAll('.view').forEach((v) => {
    v.classList.add('hidden');
    v.classList.remove('active');
  });
  const nextView = document.getElementById(`view-${tab}`);
  if (nextView) {
    nextView.classList.remove('hidden');
    nextView.classList.add('active');
  }

  activeTab = tab;

  // Update download button label
  downloadBtn.textContent = FORMAT_META[tab]?.label || '⬇ Download';

  // Render tab content
  await renderTab(tab);
}

// ── Helpers ───────────────────────────────────────────────────────
function blobToText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

let toastTimer;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function showLoading(on) {
  let overlay = document.querySelector('.loading-overlay');
  if (on && !overlay) {
    overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div><span>Loading article…</span>';
    document.querySelector('.preview-main').appendChild(overlay);
  } else if (!on && overlay) {
    overlay.remove();
  }
}

function showError(msg) {
  showLoading(false);
  document.querySelector('.preview-main').innerHTML =
    `<div class="loading-overlay"><p style="color:#f87171;text-align:center;max-width:380px">${msg}</p></div>`;
}

// ── Event listeners ───────────────────────────────────────────────
tabStrip.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (btn?.dataset.tab) switchTab(btn.dataset.tab);
});

themeBtn.addEventListener('click', () => setTheme(isDark ? 'light' : 'dark'));
downloadBtn.addEventListener('click', triggerDownload);
copyBtn.addEventListener('click', triggerCopy);
printBtn.addEventListener('click', () => window.print());
pngRenderBtn.addEventListener('click', generatePng);

// ── Boot ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
