// After `vite build`: writes the Arabic home screen into dist/index.html so it shows before the app code loads,
// and gives the service worker this build's file list so a second visit opens from the phone.
import { build } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = 'dist';
const SSR_OUT = 'dist-ssr';

await build({ logLevel: 'warn', build: { ssr: 'src/prerender.tsx', outDir: SSR_OUT, emptyOutDir: true, copyPublicDir: false } });
const { render } = await import(pathToFileURL(`${SSR_OUT}/prerender.js`).href);
const html = render();
rmSync(SSR_OUT, { recursive: true, force: true });

let page = readFileSync(`${OUT}/index.html`, 'utf8');
if (!page.includes('<div id="root"></div>')) throw new Error('prerender: #root not found in index.html');
page = page.replace('<div id="root"></div>', `<div id="root">${html}</div>`);

// Every screen uses the two Arabic weights; asking for them up front saves a round trip before the text settles.
const fonts = readdirSync(`${OUT}/assets`).filter((f) => /arabic-arabic-(400|600)-normal-.*\.woff2$/.test(f));
if (fonts.length !== 2) throw new Error(`prerender: expected two Arabic fonts, found ${fonts.length}`);
const preloads = fonts.map((f) => `<link rel="preload" href="./assets/${f}" as="font" type="font/woff2" crossorigin>`).join('');
page = page.replace('</title>', `</title>${preloads}`);

// The early inline script is allowed by its hash in the CSP; stop the build if the two drift apart.
const inline = page.match(/<script>([^<]*)<\/script>/)?.[1];
const hash = inline && createHash('sha256').update(inline).digest('base64');
if (!hash || !page.includes(`'sha256-${hash}'`)) throw new Error(`prerender: CSP hash for the inline script should be 'sha256-${hash}'`);
writeFileSync(`${OUT}/index.html`, page);

// Only the modern font format is cached; browsers that use these fonts all read woff2.
const assets = readdirSync(`${OUT}/assets`).filter((f) => !f.endsWith('.woff')).map((f) => `./assets/${f}`);
const version = createHash('sha256').update(page).update(assets.join()).digest('hex').slice(0, 10);
let sw = readFileSync(`${OUT}/sw.js`, 'utf8');
sw = sw.replace("const VERSION = 'dev';", `const VERSION = '${version}';`).replace('const ASSETS = [];', `const ASSETS = ${JSON.stringify(assets)};`);
if (!sw.includes(version)) throw new Error('prerender: could not stamp sw.js');
writeFileSync(`${OUT}/sw.js`, sw);

console.log(`prerendered home (${(html.length / 1024).toFixed(1)} kB), service worker ${version} with ${assets.length} files`);
