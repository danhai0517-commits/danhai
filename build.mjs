import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const result = await build({
  absWorkingDir: root,
  entryPoints: ['farm.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  charset: 'utf8',
  legalComments: 'inline',
  write: false,
  alias: {
    three: path.join(root, 'vendor/three.module.js'),
    'three/addons/controls/OrbitControls.js': path.join(root, 'vendor/OrbitControls.js'),
  },
});
const [template, css, startup, license] = await Promise.all(
  ['index.template.html', 'style.css', 'startup.js', 'vendor/THREE-LICENSE.txt'].map(file => readFile(path.join(root, file), 'utf8')),
);
// Escape HTML closing tags even when they occur inside JavaScript strings.
const escapeScript = code => code.replace(/<\/script/gi, '<\\/script');
const html = template
  .replace('<!-- FARM_STYLES -->', () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`)
  .replace('<!-- FARM_SCRIPTS -->', () => `<!-- Bundled Three.js license:\n${license}-->\n<script>${escapeScript(startup)}</script>\n<script>try {\n${escapeScript(result.outputFiles[0].text)}\n} catch (error) { window.FarmStartup.fail(); console.error(error); }</script>`);
const output = path.join(root, 'index.html');
if (process.argv.includes('--check')) {
  if (await readFile(output, 'utf8') !== html) throw new Error('index.html is out of date. Run npm run build.');
  console.log('Standalone index.html is up to date.');
} else {
  await writeFile(output, html);
  console.log(`Built standalone index.html (${Math.round(Buffer.byteLength(html) / 1024)} KB).`);
}
