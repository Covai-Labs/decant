(async () => {
  const src = chrome.runtime.getURL('content/content.js');
  await import(src);
})();
