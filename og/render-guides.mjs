// Render each guide's share image from its own hero: og/<page>.jpg in site/og/.
// Serve site/ first (python3 -m http.server -d site 8765), then: node og/render-guides.mjs
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.SITE_URL || 'http://127.0.0.1:8765';
const pages = ['cdj-usb-without-rekordbox', 'onelibrary', 'beatgrids', 'linux'];
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--use-angle=gl-egl', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
for (const name of pages) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  await page.goto(`${base}/${name}.html?still`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(here, '..', 'site', 'og', `${name}.jpg`), type: 'jpeg', quality: 82 });
  await page.close();
}
await browser.close();
