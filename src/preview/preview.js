import { toMarkdown, toHtml, toJson, toDoc } from '../shared/exporters.js';

// ── DOM refs ──────────────────────────────────────────────────────
const articleTitleEl = document.getElementById('article-title');
const sourceLinkEl   = document.getElementById('source-link');
const loadingEl      = document.getElementById('loading-overlay');
const renderWrapper  = document.getElementById('render-wrapper');
const codeWrapper    = document.getElementById('code-wrapper');
const htmlIframe     = document.getElementById('html-iframe');
const codeEl         = document.getElementById('preview-code');
const tabStrip       = document.getElementById('format-tabs');
const themeBtn       = document.getElementById('theme-btn');
const copyBtn        = document.getElementById('copy-btn');
const printBtn       = document.getElementById('print-btn');
const downloadBtn    = document.getElementById('download-btn');

// ── State ─────────────────────────────────────────────────────────
let articleData    = null;
let isDark         = true;
let iframeLoaded   = false;

// Pre-generated format strings (populated in init)
let htmlStr      = '';
let markdownStr  = '';
let jsonStr      = '';
let docStr       = '';

// Active format tracking
let activeContent   = '';
let activeExtension = 'html';
let activeTab       = 'html-live';

// ── Helpers ───────────────────────────────────────────────────────
function blobToText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

function injectLibsAndTheme(html, theme) {
  const base = chrome.runtime.getURL('preview/lib/');
  const inject = `
<link rel="stylesheet" href="${base}katex/katex.min.css">
<link rel="stylesheet" href="${base}prismjs/prism-tomorrow.min.css">
<script src="${base}katex/katex.min.js"><\/script>
<script src="${base}katex/auto-render.min.js"><\/script>
<script src="${base}prismjs/prism-bundle.js"><\/script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (window.renderMathInElement) {
      renderMathInElement(document.body, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$',  right: '$',  display: false}
        ]
      });
    }
    if (window.Prism) Prism.highlightAll();
  });
<\/script>`;

  const colorOverride = `<style>:root,html{color-scheme:${theme};}</style>`;

  return html.replace('</head>', inject + colorOverride + '</head>');
}

// ── Tab switching ─────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;

  // Update tab button styles
  tabStrip.querySelectorAll('.tab-btn').forEach((btn) => {
    const selected = btn.dataset.tab === tab;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
  });

  // Hide all panes
  renderWrapper.classList.add('hidden');
  codeWrapper.classList.add('hidden');

  if (tab === 'html-live' || tab === 'png') {
    renderWrapper.classList.remove('hidden');
    if (!iframeLoaded) {
      const theme = isDark ? 'dark' : 'light';
      htmlIframe.srcdoc = injectLibsAndTheme(htmlStr, theme);
      iframeLoaded = true;
    }
    activeContent   = htmlStr;
    activeExtension = tab === 'png' ? 'png' : 'html';
    printBtn.classList.remove('hidden');

  } else {
    codeWrapper.classList.remove('hidden');
    printBtn.classList.add('hidden');

    if (tab === 'markdown') {
      codeEl.textContent  = markdownStr;
      codeEl.className    = 'language-markdown';
      activeContent       = markdownStr;
      activeExtension     = 'md';
    } else if (tab === 'html-code') {
      codeEl.textContent  = htmlStr;
      codeEl.className    = 'language-html';
      activeContent       = htmlStr;
      activeExtension     = 'html';
    } else if (tab === 'json') {
      codeEl.textContent  = jsonStr;
      codeEl.className    = 'language-json';
      activeContent       = jsonStr;
      activeExtension     = 'json';
    } else if (tab === 'doc') {
      codeEl.textContent  = docStr;
      codeEl.className    = 'language-html';
      activeContent       = docStr;
      activeExtension     = 'doc';
    }

    if (window.Prism) Prism.highlightElement(codeEl);
  }

  updateDownloadLabel();
}

// ── Download label ────────────────────────────────────────────────
const DL_LABELS = {
  html: '⬇ Download .html',
  md:   '⬇ Download .md',
  json: '⬇ Download .json',
  doc:  '⬇ Download .doc',
  png:  '⬇ Download .png',
};

function updateDownloadLabel() {
  downloadBtn.textContent = DL_LABELS[activeExtension] || '⬇ Download';
}

// ── Download ──────────────────────────────────────────────────────
async function triggerDownload() {
  if (!articleData) return;

  if (activeExtension === 'png') {
    await downloadPng();
    return;
  }

  const converters = {
    html: () => toHtml(articleData),
    md:   () => toMarkdown(articleData),
    json: () => toJson(articleData),
    doc:  () => toDoc(articleData),
  };

  const convert = converters[activeExtension] || converters.html;
  const { blob, ext } = convert();
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `${articleData.baseFilename || 'article'}.${ext}`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── PNG download ──────────────────────────────────────────────────
async function downloadPng() {
  if (!window.html2canvas) {
    alert('html2canvas library is not loaded');
    return;
  }

  const origText = downloadBtn.textContent;
  downloadBtn.disabled = true;
  downloadBtn.textContent = 'Generating PNG…';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, 'text/html');
    const articleEl = doc.querySelector('article') || doc.body;

    const container = document.createElement('div');
    container.style.cssText = [
      'position:fixed', 'top:-9999px', 'left:0', 'width:900px',
      'background:#ffffff', 'color:#1a202c', 'padding:48px 64px',
      'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      'font-size:18px', 'line-height:1.7'
    ].join(';');
    container.innerHTML = articleEl.innerHTML;
    document.body.appendChild(container);

    const canvas = await window.html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });
    document.body.removeChild(container);

    const dataUrl = canvas.toDataURL('image/png');
    const a = Object.assign(document.createElement('a'), {
      href: dataUrl,
      download: `${articleData.baseFilename || 'article'}.png`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    alert('PNG generation failed: ' + err.message);
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = origText;
  }
}

// ── Copy ──────────────────────────────────────────────────────────
async function triggerCopy() {
  if (!activeContent) return;
  const orig = copyBtn.innerHTML;
  try {
    await navigator.clipboard.writeText(activeContent);
    copyBtn.textContent = '✓ Copied';
    setTimeout(() => { copyBtn.innerHTML = orig; }, 1800);
  } catch {
    copyBtn.textContent = 'Failed';
    setTimeout(() => { copyBtn.innerHTML = orig; }, 1800);
  }
}

// ── Print ─────────────────────────────────────────────────────────
function triggerPrint() {
  if (htmlIframe?.contentWindow) {
    htmlIframe.contentWindow.focus();
    htmlIframe.contentWindow.print();
  } else {
    window.print();
  }
}

// ── Theme ─────────────────────────────────────────────────────────
function setTheme(theme) {
  isDark = theme === 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  themeBtn.textContent = isDark ? '🌙' : '☀️';
  themeBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  chrome.storage.local.set({ previewTheme: theme });

  if ((activeTab === 'html-live' || activeTab === 'png') && htmlStr) {
    iframeLoaded = false;
    switchTab(activeTab);
  }
}

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(location.search);
  const key = params.get('key');

  if (!key) {
    loadingEl.innerHTML = '<p style="color:#f87171">No article key found. Re-clip the page from Decant.</p>';
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
    chrome.storage.session.remove(key);

    if (!articleData) {
      loadingEl.innerHTML = '<p style="color:#f87171">Article data expired. Re-clip the page.</p>';
      return;
    }

    const prefs = await new Promise((r) => chrome.storage.local.get('previewTheme', r));
    isDark = prefs.previewTheme !== 'light';
    setTheme(isDark ? 'dark' : 'light');

    document.title = `${articleData.title || 'Article'} — Decant Export`;
    articleTitleEl.textContent = articleData.title || 'Untitled';
    if (articleData.url) sourceLinkEl.href = articleData.url;

    markdownStr = articleData.markdown;
    htmlStr     = await blobToText(toHtml(articleData).blob);
    jsonStr     = await blobToText(toJson(articleData).blob);
    docStr      = await blobToText(toDoc(articleData).blob);

    // Hide loading, show initial tab
    loadingEl.style.display = 'none';
    switchTab('html-live');

  } catch (err) {
    loadingEl.innerHTML = `<p style="color:#f87171">Failed to load: ${err.message}</p>`;
  }
}

// ── Event listeners ───────────────────────────────────────────────
tabStrip.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (btn?.dataset.tab) switchTab(btn.dataset.tab);
});

themeBtn.addEventListener('click',    () => setTheme(isDark ? 'light' : 'dark'));
downloadBtn.addEventListener('click', triggerDownload);
copyBtn.addEventListener('click',     triggerCopy);
printBtn.addEventListener('click',    triggerPrint);
pngRenderBtn.addEventListener('click', generatePng);

// ── Boot ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
