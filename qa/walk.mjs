/* Viewport-by-viewport capture. A fullPage screenshot is meaningless on this
   page: the reveals are SCRUBBED, so returning to scrollY 0 correctly puts
   every below-fold block back to hidden. This walks the page the way a reader
   does and captures what they actually see. */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'walk');
await mkdir(OUT, { recursive: true });

const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
const b = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', userDataDir: '/private/tmp/claude-501/hyrox-qa-profile',
  args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'],
});
const p = await b.newPage();
await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await p.goto(process.env.QA_URL || 'http://localhost:8795/', { waitUntil: 'networkidle0' });
await p.evaluate(() => { try { localStorage.clear(); } catch {} });
await p.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1200));

const total = await p.evaluate(() => document.body.scrollHeight);
const stepPx = Math.round(H * 0.86);
const n = Math.ceil((total - H) / stepPx) + 1;
for (let i = 0; i < n; i++) {
  const y = Math.min(i * stepPx, total - H);
  /* ease into position in a few hops so the damped channels track a real read
     rather than a teleport, then settle well past the longest tau */
  await p.evaluate(async (target) => {
    const from = window.scrollY;
    for (let k = 1; k <= 6; k++) {
      window.scrollTo(0, from + (target - from) * (k / 6));
      await new Promise((r) => setTimeout(r, 55));
    }
  }, y);
  await new Promise((r) => setTimeout(r, 1500));
  await p.screenshot({ path: join(OUT, `${String(i).padStart(2, '0')}.png`) });
}
console.log(`captured ${n} frames at ${W}x${H}`);
await b.close();
