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
const pngBtn         = document.getElementById('png-btn');
const downloadBtn    = document.getElementById('download-btn');
const pngWarningBanner = document.getElementById('png-warning-banner');
const pngOptionsBar  = document.getElementById('png-options-bar');
const pngQualityCheckbox = document.getElementById('png-quality-checkbox');
const includeImagesCheckbox = document.getElementById('include-images-checkbox');

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
let activeExtension = 'md';
let activeTab       = 'markdown';

// PNG caching
let cachedPngBlob = null;

// Blob URL management
let currentBlobUrl = null;

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
  // Theme sync via postMessage
  window.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'setTheme') {
      const theme = event.data.theme;
      if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
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

  // Hide all panes initially
  renderWrapper.classList.add('hidden');
  codeWrapper.classList.add('hidden');

  // Reset dynamic button visibilities & banner
  if (copyBtn)     copyBtn.classList.add('hidden');
  if (printBtn)    printBtn.classList.add('hidden');
  if (pngBtn)      pngBtn.classList.add('hidden');
  if (downloadBtn) downloadBtn.classList.add('hidden');
  if (pngWarningBanner) pngWarningBanner.classList.toggle('hidden', tab !== 'png');
  if (pngOptionsBar) pngOptionsBar.classList.toggle('hidden', tab !== 'png');

  const isRenderPane = tab === 'html-live' || tab === 'pdf' || tab === 'png';

  if (isRenderPane) {
    renderWrapper.classList.remove('hidden');

    // Check if content has changed before reloading iframe
    const currentContent = htmlIframe.getAttribute('data-content');
    const contentChanged = !currentContent || currentContent !== htmlStr;

    if (!iframeLoaded || contentChanged) {
      const theme = isDark ? 'dark' : 'light';
      htmlIframe.onload = () => {
        // Sync theme after iframe loads
        syncThemeToIframe(theme);

        try {
          const win = htmlIframe.contentWindow;
          const doc = htmlIframe.contentDocument;
          if (win && doc) {
            if (win.renderMathInElement) {
              win.renderMathInElement(doc.body, {
                delimiters: [
                  {left: '$$', right: '$$', display: true},
                  {left: '$',  right: '$',  display: false}
                ]
              });
            }
            if (win.Prism) win.Prism.highlightAll();
          }
        } catch (err) {
          console.warn('Iframe post-load rendering failed:', err);
        }
      };

      htmlIframe.onerror = () => {
        console.error('Iframe loading failed');
        loadingEl.innerHTML = '<p style="color:#f87171">Failed to load preview. Please try again.</p>';
      };

      htmlIframe.setAttribute('data-content', htmlStr);
      setIframeContent(injectLibsAndTheme(htmlStr, theme));
      iframeLoaded = true;
    }

    // Set content and extension based on tab
    if (tab === 'html-live') {
      activeContent   = htmlStr;
      activeExtension = 'html';
    } else if (tab === 'pdf') {
      activeContent   = htmlStr;
      activeExtension = 'pdf';
    } else if (tab === 'png') {
      activeContent   = htmlStr;
      activeExtension = 'png';
    }

    // Show appropriate buttons for render panes
    if (tab === 'html-live') {
      if (copyBtn) copyBtn.classList.remove('hidden');
      if (downloadBtn) downloadBtn.classList.remove('hidden');
    } else if (tab === 'pdf') {
      if (printBtn) printBtn.classList.remove('hidden');
    } else if (tab === 'png') {
      if (pngBtn) pngBtn.classList.remove('hidden');
    }

  } else {
    codeWrapper.classList.remove('hidden');

    // Set content and extension based on tab
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

    // Show appropriate buttons for code panes
    if (tab === 'markdown' || tab === 'html-code' || tab === 'json') {
      if (copyBtn) copyBtn.classList.remove('hidden');
      if (downloadBtn) downloadBtn.classList.remove('hidden');
    } else if (tab === 'doc') {
      if (downloadBtn) downloadBtn.classList.remove('hidden');
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

  const btnToDisable = pngBtn || downloadBtn;
  const origText = btnToDisable.textContent;
  btnToDisable.disabled = true;
  btnToDisable.textContent = 'Generating PNG…';

  try {
    // Get PNG options
    const highQuality = pngQualityCheckbox ? pngQualityCheckbox.checked : true;
    const includeImages = includeImagesCheckbox ? includeImagesCheckbox.checked : true;

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, 'text/html');
    const articleEl = doc.querySelector('article') || doc.body;

    if (!articleEl || !articleEl.innerHTML) {
      throw new Error('No content found to render as PNG');
    }

    const container = document.createElement('div');
    container.style.cssText = [
      'position:absolute', 'left:-9999px', 'top:0', 'width:900px',
      'background:#ffffff', 'color:#1a202c', 'padding:48px 64px',
      'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      'font-size:18px', 'line-height:1.7', 'box-sizing:border-box'
    ].join(';');

    // Clone content and optionally remove images
    let contentHtml = articleEl.innerHTML;
    if (!includeImages) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contentHtml;
      const images = tempDiv.querySelectorAll('img');
      images.forEach(img => img.remove());
      contentHtml = tempDiv.innerHTML;
    }

    container.innerHTML = contentHtml;
    document.body.appendChild(container);

    const canvas = await window.html2canvas(container, {
      scale: highQuality ? 2 : 1,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 900,
      scrollX: 0,
      scrollY: 0,
    });
    document.body.removeChild(container);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to generate PNG blob from canvas'));
      }, 'image/png');
    });

    // Cache the blob
    cachedPngBlob = blob;

    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${articleData.baseFilename || 'article'}.png`,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (err) {
    alert('PNG generation failed: ' + err.message);
  } finally {
    btnToDisable.disabled = false;
    btnToDisable.textContent = origText;
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

  // Sync theme to iframe via postMessage
  syncThemeToIframe(theme);

  // Reload iframe with new theme if in render pane
  if (activeTab === 'html-live' || activeTab === 'pdf' || activeTab === 'png') {
    iframeLoaded = false;
    switchTab(activeTab);
  }
}

function syncThemeToIframe(theme) {
  try {
    if (htmlIframe && htmlIframe.contentWindow) {
      htmlIframe.contentWindow.postMessage({ action: 'setTheme', theme }, '*');
    }
  } catch (err) {
    console.warn('Failed to sync theme to iframe:', err);
  }

  // Also try direct DOM manipulation
  try {
    const doc = htmlIframe.contentDocument ||
                (htmlIframe.contentWindow && htmlIframe.contentWindow.document);
    if (doc && doc.documentElement) {
      if (theme === 'dark') {
        doc.documentElement.setAttribute('data-theme', 'dark');
      } else if (theme === 'light') {
        doc.documentElement.setAttribute('data-theme', 'light');
      } else {
        doc.documentElement.removeAttribute('data-theme');
      }
    }
  } catch (err) {
    // Ignore iframe DOM access errors (cross-origin restrictions)
  }
}

// ── PNG options event listeners ─────────────────────────────────────
if (pngQualityCheckbox) {
  pngQualityCheckbox.addEventListener('change', () => {
    cachedPngBlob = null;
  });
}
if (includeImagesCheckbox) {
  includeImagesCheckbox.addEventListener('change', () => {
    cachedPngBlob = null;
  });
}

// ── Iframe content management ────────────────────────────────────────
function setIframeContent(content) {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }

  const blob = new Blob([content], { type: 'text/html' });
  currentBlobUrl = URL.createObjectURL(blob);
  htmlIframe.src = currentBlobUrl;
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

    loadingEl.style.display = 'none';
    const requestedTab = params.get('tab');
    let initialTab = 'markdown';
    if (requestedTab === 'html' || requestedTab === 'html-live') {
      initialTab = 'html-live';
    } else if (requestedTab === 'pdf') {
      initialTab = 'pdf';
    } else if (requestedTab === 'png') {
      initialTab = 'png';
    } else if (requestedTab === 'json') {
      initialTab = 'json';
    } else if (requestedTab === 'doc') {
      initialTab = 'doc';
    } else if (requestedTab === 'html-code') {
      initialTab = 'html-code';
    }
    switchTab(initialTab);

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
if (printBtn) printBtn.addEventListener('click', triggerPrint);
if (pngBtn)   pngBtn.addEventListener('click',   downloadPng);

// Cleanup blob URL on page unload
window.addEventListener('beforeunload', () => {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
  }
});

// ── Boot ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
