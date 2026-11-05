import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(projectRoot, '..', 'dragon-follower-widget-demo.html');

let html = await readFile(join(projectRoot, 'index.html'), 'utf8');
const css = await readFile(join(projectRoot, 'styles.css'), 'utf8');
const javascript = await readFile(join(projectRoot, 'app.js'), 'utf8');

html = html
  .replace('<link rel="stylesheet" href="styles.css" />', `<style>\n${css}\n</style>`)
  .replace('<script src="app.js"></script>', `<script>\n${javascript.replaceAll('</script>', '<\\/script>')}\n</script>`);

const assetMatches = [...html.matchAll(/src="(assets\/[^"]+\.png)"/g)];
for (const [, assetPath] of assetMatches) {
  const asset = await readFile(join(projectRoot, assetPath));
  html = html.replaceAll(assetPath, `data:image/png;base64,${asset.toString('base64')}`);
}

await writeFile(outputPath, html);
console.log(outputPath);
