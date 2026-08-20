import { getOptions } from './storage.js';

let customMessagesCache = null;
let currentLanguage = 'auto';

/**
 * Loads custom messages.json if a specific non-auto language is selected.
 */
async function loadCustomMessages(lang) {
  if (!lang || lang === 'auto') {
    customMessagesCache = null;
    return;
  }
  try {
    const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
    const resp = await fetch(url);
    if (resp.ok) {
      customMessagesCache = await resp.json();
    } else {
      customMessagesCache = null;
    }
  } catch (err) {
    console.warn(`Failed to load custom locale ${lang}:`, err);
    customMessagesCache = null;
  }
}

/**
 * Gets localized message for a key, respecting custom language setting if selected and applying substitutions.
 * @param {string} key
 * @param {string} [fallback='']
 * @param {string[]|string} [substitutions=[]]
 * @returns {string}
 */
export function getMessage(key, fallback = '', substitutions = []) {
  const subs = Array.isArray(substitutions)
    ? substitutions
    : substitutions !== undefined && substitutions !== null && substitutions !== ''
      ? [substitutions]
      : [];

  let msg = '';
  if (customMessagesCache && customMessagesCache[key]) {
    msg = customMessagesCache[key].message;
  } else if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
    msg = chrome.i18n.getMessage(key, subs);
  }

  if (!msg) {
    msg = fallback;
  }

  if (msg && subs.length > 0) {
    subs.forEach((sub, i) => {
      msg = msg.replaceAll(`$${i + 1}`, String(sub));
    });
  }

  return msg;
}

/**
 * Localizes all DOM elements in the document or container matching data-i18n attributes.
 * @param {HTMLElement|Document} [root=document]
 */
export async function initI18n(root = document) {
  const options = await getOptions();
  currentLanguage = options.uiLanguage || 'auto';
  await loadCustomMessages(currentLanguage);

  // Text content
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const msg = getMessage(key, el.textContent);
    if (msg) el.textContent = msg;
  });

  // Title / Tooltip
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    const msg = getMessage(key, el.getAttribute('title') || '');
    if (msg) el.setAttribute('title', msg);
  });

  // Placeholder
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const msg = getMessage(key, el.getAttribute('placeholder') || '');
    if (msg) el.setAttribute('placeholder', msg);
  });

  // Aria label
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    const msg = getMessage(key, el.getAttribute('aria-label') || '');
    if (msg) el.setAttribute('aria-label', msg);
  });
}
