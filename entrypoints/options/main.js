import { getOptions, saveOptions } from '../../src/shared/storage.js';
import { initI18n } from '../../src/shared/i18n.js';

const form = document.getElementById('options-form');
const uiLanguage = document.getElementById('uiLanguage');
const defaultAiTarget = document.getElementById('defaultAiTarget');
const aiPromptTemplate = document.getElementById('aiPromptTemplate');
const defaultAppTarget = document.getElementById('defaultAppTarget');
const obsidianVault = document.getElementById('obsidianVault');
const includeFrontmatter = document.getElementById('includeFrontmatter');
const frontmatterTemplate = document.getElementById('frontmatterTemplate');
const headingStyle = document.getElementById('headingStyle');
const bulletListMarker = document.getElementById('bulletListMarker');
const codeBlockStyle = document.getElementById('codeBlockStyle');
const saveStatus = document.getElementById('save-status');

async function loadSettings() {
  const options = await getOptions();
  uiLanguage.value = options.uiLanguage || 'auto';
  defaultAiTarget.value = options.defaultAiTarget || 'chatgpt';
  aiPromptTemplate.value = options.aiPromptTemplate || '';
  defaultAppTarget.value = options.defaultAppTarget || 'obsidian';
  obsidianVault.value = options.obsidianVault || '';
  includeFrontmatter.checked = options.includeFrontmatter;
  frontmatterTemplate.value = options.frontmatterTemplate;
  headingStyle.value = options.headingStyle;
  bulletListMarker.value = options.bulletListMarker;
  codeBlockStyle.value = options.codeBlockStyle;

  await initI18n();
}

uiLanguage.addEventListener('change', async () => {
  await saveOptions({ ...(await getOptions()), uiLanguage: uiLanguage.value });
  await initI18n();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const options = {
    uiLanguage: uiLanguage.value,
    defaultAiTarget: defaultAiTarget.value,
    aiPromptTemplate: aiPromptTemplate.value,
    defaultAppTarget: defaultAppTarget.value,
    obsidianVault: obsidianVault.value,
    includeFrontmatter: includeFrontmatter.checked,
    frontmatterTemplate: frontmatterTemplate.value,
    headingStyle: headingStyle.value,
    bulletListMarker: bulletListMarker.value,
    codeBlockStyle: codeBlockStyle.value,
  };

  await saveOptions(options);
  await initI18n();

  saveStatus.classList.remove('hidden');
  setTimeout(() => {
    saveStatus.classList.add('hidden');
  }, 2000);
});

document.addEventListener('DOMContentLoaded', loadSettings);
