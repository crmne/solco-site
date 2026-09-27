// Render og.html to og.png (1200x630) and og@2x.png on the GPU.
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--use-angle=gl-egl', '--use-gl=angle', '--ignore-gpu-blocklist'],
});
for (const [scale, name] of [[1, 'og.png'], [2, 'og@2x.png']]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: scale });
  await page.goto('file://' + path.join(here, 'og.html'));
  await page.evaluate(() => document.fonts.ready);
  if (scale === 1) {
    const renderer = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const info = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return gl ? gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : 'no webgl';
    });
    console.log('renderer:', renderer);
  }
  await page.screenshot({ path: path.join(here, name) });
  await page.close();
}
await browser.close();
