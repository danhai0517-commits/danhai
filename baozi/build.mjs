import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.join(root, '..', 'vendor');
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  charset: 'utf8',
  legalComments: 'inline',
  write: false,
  alias: { three: path.join(vendor, 'three.module.js') },
});
const [template, css, startup, license] = await Promise.all([
  readFile(path.join(root, 'index.template.html'), 'utf8'),
  readFile(path.join(root, 'style.css'), 'utf8'),
  readFile(path.join(root, 'startup.js'), 'utf8'),
  readFile(path.join(vendor, 'THREE-LICENSE.txt'), 'utf8'),
]);
const escapeScript = code => code.replace(/<\/script/gi, '<\\/script');
const html = template
  .replace('<!-- BAOZI_STYLES -->', () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`)
  .replace('<!-- BAOZI_SCRIPTS -->', () => `<!-- Bundled Three.js license:\n${license}-->\n<script>${escapeScript(startup)}</script>\n<script>try {\n${escapeScript(result.outputFiles[0].text)}\n} catch (error) { window.BaoziStartup.fail(); console.error(error); }</script>`);
const output = path.join(root, 'index.html');
if (process.argv.includes('--check')) {
  if (await readFile(output, 'utf8') !== html) throw new Error('baozi/index.html is out of date. Run npm run build:baozi.');
  console.log('Standalone baozi/index.html is up to date.');
} else {
  await writeFile(output, html);
  console.log(`Built standalone baozi/index.html (${Math.round(Buffer.byteLength(html) / 1024)} KB).`);
}
