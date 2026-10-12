// Folds the `vite build --mode artifact` output into one HTML fragment for the hosted demo.
// The host wraps the fragment in its own document and CSP, so the app's CSP meta is not carried over.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'dist-artifact';
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const jsPath = html.match(/<script[^>]+src="\.\/([^"]+\.js)"/)?.[1];
const cssPath = html.match(/<link[^>]+href="\.\/([^"]+\.css)"/)?.[1];
if (!jsPath || !cssPath) throw new Error('Could not find the built script or stylesheet');

// Keep only the woff2 copy of each font face; every browser the app supports reads woff2.
const css = readFileSync(join(dir, cssPath), 'utf8').replace(/,\s*url\(data:font\/woff;base64,[^)]+\)\s*format\(["']woff["']\)/g, '');
const js = readFileSync(join(dir, jsPath), 'utf8').replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// Inside the hosted viewer the page root is already padded by the phone's safe areas.
const hostOverrides = `
.shell{min-height:calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))}
.topbar{top:env(safe-area-inset-top,0px);padding-top:10px}
.hero{padding-top:14px}
`;

const page = `<title>طبيب · Tabib</title>
<meta name="description" content="طبيب: ابحث عن طبيب أو مستشفى في أربيل واحجز موعداً. Find a doctor or hospital in Erbil.">
<meta name="referrer" content="no-referrer">
<style>${css}${hostOverrides}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
writeFileSync(join(dir, 'tabib.html'), page);
console.log(`tabib.html ${(page.length / 1024).toFixed(0)} KB`);
