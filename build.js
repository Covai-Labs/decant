import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const isWatch = process.argv.includes('--watch');
const targetArg = process.argv.find((arg) => arg.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'chromium';

console.log(`Building Decant for target: ${target}`);

const distDir = target === 'firefox' ? 'dist-firefox' : 'dist';

// Clean existing dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Ensure dist directory structure exists
const dirs = [
  distDir,
  `${distDir}/background`,
  `${distDir}/content`,
  `${distDir}/popup`,
  `${distDir}/options`,
  `${distDir}/icons`,
];

if (target !== 'firefox') {
  dirs.push(`${distDir}/sidepanel`);
}

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Process and copy manifest.json
function processManifest() {
  const rawManifest = fs.readFileSync('src/manifest.json', 'utf8');
  const manifest = JSON.parse(rawManifest);

  if (target === 'firefox') {
    manifest.browser_specific_settings = {
      gecko: {
        id: 'decant@rats.dev',
        strict_min_version: '140.0',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    };
    manifest.permissions = manifest.permissions.filter((p) => p !== 'sidePanel');
    delete manifest.side_panel;
    manifest.background = {
      scripts: ['background/background.js'],
    };
  }

  fs.writeFileSync(`${distDir}/manifest.json`, JSON.stringify(manifest, null, 2));
}

// Copy static assets (HTML, CSS, icons)
function copyStaticFiles() {
  processManifest();

  const staticFiles = [
    { src: 'src/popup/popup.html', dest: `${distDir}/popup/popup.html` },
    { src: 'src/popup/popup.css', dest: `${distDir}/popup/popup.css` },
    { src: 'src/options/options.html', dest: `${distDir}/options/options.html` },
    { src: 'src/options/options.css', dest: `${distDir}/options/options.css` },
  ];

  if (target !== 'firefox') {
    staticFiles.push(
      { src: 'src/sidepanel/sidepanel.html', dest: `${distDir}/sidepanel/sidepanel.html` },
      { src: 'src/sidepanel/sidepanel.css', dest: `${distDir}/sidepanel/sidepanel.css` },
    );
  }

  staticFiles.forEach(({ src, dest }) => {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });

  if (fs.existsSync('src/icons')) {
    const icons = fs.readdirSync('src/icons');
    icons.forEach((icon) => {
      fs.copyFileSync(path.join('src/icons', icon), path.join(`${distDir}/icons`, icon));
    });
  }
}

copyStaticFiles();

// ESBuild entry points
const entryPoints = [
  { in: 'src/background/background.js', out: 'background/background' },
  { in: 'src/content/content.js', out: 'content/content' },
  { in: 'src/popup/popup.js', out: 'popup/popup' },
  { in: 'src/options/options.js', out: 'options/options' },
];

if (target !== 'firefox') {
  entryPoints.push({ in: 'src/sidepanel/sidepanel.js', out: 'sidepanel/sidepanel' });
}

const buildOptions = {
  entryPoints,
  bundle: true,
  outdir: distDir,
  format: 'iife',
  target: ['chrome100', 'firefox109', 'edge100'],
  platform: 'browser',
  sourcemap: true,
  logLevel: 'info',
};

async function runBuild() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log(`Watching for changes in ${distDir}...`);
  } else {
    await esbuild.build(buildOptions);
    console.log(`Build completed successfully in ${distDir}/`);
  }
}

runBuild().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
