/* Mobile audit against the LIVE deployed URL.
 *
 * This runs on the deployment, not localhost, because that is what the
 * recipient opens. She will most likely open it from Gmail on a phone, so the
 * in-app-browser case (a short visual viewport, 100svh) is audited explicitly
 * alongside real device widths and landscape.
 */
import puppeteer from 'puppeteer-core';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'mobile');
const URL_ = process.env.QA_URL || 'https://sindrimar02.github.io/hyrox-preview/';
await mkdir(OUT, { recursive: true });

const DEVICES = [
  { name: 'iphone-se',      w: 375, h: 667,  dpr: 2 },
  { name: 'iphone-14',      w: 390, h: 844,  dpr: 3 },
  { name: 'iphone-max',     w: 430, h: 932,  dpr: 3 },
  { name: 'android-mid',    w: 360, h: 800,  dpr: 3 },
  { name: 'inapp-gmail',    w: 390, h: 720,  dpr: 3 },  // browser chrome eats height
  { name: 'landscape',      w: 844, h: 390,  dpr: 3 },
  { name: 'tablet',         w: 768, h: 1024, dpr: 2 },
];

const rep = { fail: [], warn: [], info: [] };
const FAIL = (d, m) => rep.fail.push(`[${d}] ${m}`);
const WARN = (d, m) => rep.warn.push(`[${d}] ${m}`);
const INFO = (m) => rep.info.push(m);

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  userDataDir: '/private/tmp/claude-501/hyrox-mobile-profile',
  args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'],
});
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

/* one-time: transfer weight and LCP-relevant bytes */
{
  const p = await browser.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
  const bytes = {};
  p.on('response', async (r) => {
    try {
      const len = Number(r.headers()['content-length'] || 0);
      const t = (r.headers()['content-type'] || '').split(';')[0];
      bytes[t] = (bytes[t] || 0) + len;
    } catch { /* ignore */ }
  });
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  await settle(3200);
  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  const lcp = await p.evaluate(() => new Promise((res) => {
    let v = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) v = e.startTime; })
      .observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(() => res(Math.round(v)), 600);
  }));
  INFO(`transfer ${(total / 1024).toFixed(0)} KB total :: ${Object.entries(bytes)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([k, v]) => `${k} ${(v / 1024).toFixed(0)}KB`).join(', ')}`);
  INFO(`LCP ${lcp} ms @390 (throttling off)`);
  if (total > 3.2 * 1024 * 1024) FAIL('weight', `${(total / 1024 / 1024).toFixed(2)} MB on first load`);
  await p.close();
}

for (const d of DEVICES) {
  const p = await browser.newPage();
  await p.setViewport({ width: d.w, height: d.h, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true });
  await p.evaluateOnNewDocument(() => {
    try { localStorage.clear(); } catch {}
    addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.scrollBehavior = 'auto';
    });
  });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

  await p.goto(URL_, { waitUntil: 'networkidle0' });
  await settle(3000);
  if (errs.length) FAIL(d.name, `console: ${errs.slice(0, 2).join(' | ')}`);

  const r1 = await p.evaluate((dpr) => {
    const out = {};
    out.overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    out.wide = [...document.querySelectorAll('body *')]
      .filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.right > innerWidth + 1.5 && getComputedStyle(e).position !== 'fixed';
      })
      .map((e) => `${(e.className || e.tagName).toString().split(' ')[0]}(+${Math.round(e.getBoundingClientRect().right - innerWidth)}px)`)
      .slice(0, 6);

    /* text spilling its own box: long Icelandic words in narrow tracks */
    out.spill = [...document.querySelectorAll('main *')]
      .filter((e) => {
        if (e.children.length) return false;
        const cs = getComputedStyle(e);
        if (cs.overflow !== 'visible' || cs.position === 'absolute') return false;
        return e.scrollWidth - e.clientWidth > 2 && e.clientWidth > 0;
      })
      .map((e) => `${(e.className || e.tagName).toString().split(' ')[0]}:${e.scrollWidth}>${e.clientWidth}`)
      .slice(0, 6);

    /* hero must fit the small viewport so the quiz submit is reachable */
    const hero = document.querySelector('.hero').getBoundingClientRect();
    const go = document.querySelector('.quiz-go').getBoundingClientRect();
    out.heroH = Math.round(hero.height);
    out.vh = innerHeight;
    out.submitBottom = Math.round(go.bottom);
    out.submitInView = go.bottom <= innerHeight + 1;

    /* tap targets */
    out.small = [...document.querySelectorAll('a.btn, button, summary, .qo, .lvpick-b, .pill, .gear, input, textarea, .f-lvo, .hdr-nav a, .ft-b a, .lnk')]
      .map((e) => {
        const b = e.getBoundingClientRect();
        return { c: (e.className || '').toString().split(' ')[0] || e.tagName, h: Math.round(b.height), w: Math.round(b.width) };
      })
      .filter((x) => x.h > 0 && (x.h < 44 || x.w < 24));

    /* readable type: nothing below 12px, and body copy not absurdly long */
    const texts = [...document.querySelectorAll('main p, main li, main dd')]
      .filter((e) => (e.textContent || '').trim().length > 30);
    out.tiny = texts.map((e) => ({
      c: (e.className || e.tagName).toString().split(' ')[0],
      px: +parseFloat(getComputedStyle(e).fontSize).toFixed(1),
    })).filter((x) => x.px < 12);
    /* characters per line, approximated from box width and average glyph width */
    out.longLines = texts.map((e) => {
      const cs = getComputedStyle(e);
      const px = parseFloat(cs.fontSize);
      const chars = Math.round(e.getBoundingClientRect().width / (px * 0.5));
      return { c: (e.className || e.tagName).toString().split(' ')[0], chars };
    }).filter((x) => x.chars > 78);

    /* upscaled assets */
    out.upscale = [...document.images].map((i) => ({
      src: (i.currentSrc || '').split('/').pop(),
      r: +((i.getBoundingClientRect().width * dpr) / (i.naturalWidth || 1)).toFixed(2),
    })).filter((x) => x.r > 1.3);

    /* the marquee must not create a scrollbar */
    const mq = document.querySelector('.mq');
    out.mqClipped = mq ? getComputedStyle(mq).overflow === 'hidden' : null;

    /* sticky race counter vs the fixed header */
    const hdrH = document.querySelector('.hdr').getBoundingClientRect().height;
    const sc = document.querySelector('#stcount');
    out.counterTop = sc ? parseFloat(getComputedStyle(sc).top) : null;
    out.hdrH = Math.round(hdrH);
    return out;
  }, d.dpr);

  if (r1.overflow > 0) FAIL(d.name, `horizontal overflow ${r1.overflow}px :: ${r1.wide.join(', ')}`);
  if (r1.spill.length) FAIL(d.name, `text spills its box: ${r1.spill.join(', ')}`);
  if (r1.small.length) FAIL(d.name, `tap targets under 44px: ${JSON.stringify(r1.small).slice(0, 200)}`);
  if (r1.tiny.length) FAIL(d.name, `type under 12px: ${JSON.stringify(r1.tiny)}`);
  if (r1.upscale.length) FAIL(d.name, `images upscaled past 1.3x: ${JSON.stringify(r1.upscale)}`);
  if (r1.longLines.length) WARN(d.name, `long measure: ${JSON.stringify(r1.longLines).slice(0, 160)}`);
  if (r1.mqClipped === false) FAIL(d.name, 'marquee is not clipped');
  if (r1.counterTop !== null && r1.counterTop < r1.hdrH - 4) {
    WARN(d.name, `race counter sticks at ${r1.counterTop}px under a ${r1.hdrH}px header`);
  }

  if (d.name !== 'landscape' && d.name !== 'tablet') {
    if (!r1.submitInView) {
      FAIL(d.name, `quiz submit below the fold: bottom ${r1.submitBottom} vs viewport ${r1.vh}`);
    }
    if (r1.heroH > r1.vh + 2) WARN(d.name, `hero ${r1.heroH}px taller than viewport ${r1.vh}px`);
  }
  INFO(`${d.name} ${d.w}x${d.h}@${d.dpr}: hero ${r1.heroH}/${r1.vh}, submit bottom ${r1.submitBottom}`);
  await p.screenshot({ path: join(OUT, `${d.name}-hero.png`) });

  /* burger menu */
  if (d.w < 1060) {
    const menu = await p.evaluate(async () => {
      document.querySelector('#burger').click();
      await new Promise((r) => setTimeout(r, 520));
      const mm = document.querySelector('#mmenu');
      const b = mm.getBoundingClientRect();
      const link = mm.querySelector('a');
      const lr = link.getBoundingClientRect();
      const hit = document.elementFromPoint(lr.x + Math.min(20, lr.width / 2), lr.y + lr.height / 2);
      const linksInView = [...mm.querySelectorAll('a')]
        .every((a) => { const q = a.getBoundingClientRect(); return q.bottom <= innerHeight + 1 && q.top >= -1; });
      return {
        covers: b.width >= innerWidth - 1 && b.height >= innerHeight - 1,
        opacity: +getComputedStyle(mm).opacity,
        locked: getComputedStyle(document.body).overflow === 'hidden',
        hittable: mm.contains(hit),
        linksInView,
        parentIsHeader: mm.parentElement.tagName === 'HEADER',
      };
    });
    if (!menu.covers || menu.opacity < 0.95) FAIL(d.name, `menu does not cover: ${JSON.stringify(menu)}`);
    if (!menu.locked) FAIL(d.name, 'body scroll not locked with menu open');
    if (!menu.hittable) FAIL(d.name, 'menu links not hittable');
    if (!menu.linksInView) FAIL(d.name, 'menu items fall outside the viewport');
    if (menu.parentIsHeader) FAIL(d.name, 'menu rendered inside the header');
    await p.screenshot({ path: join(OUT, `${d.name}-menu.png`) });
    await p.evaluate(() => document.querySelector('#burger').click());
    await settle(450);
  }

  /* the funnel, end to end, by touch */
  if (d.name === 'iphone-14' || d.name === 'iphone-se' || d.name === 'inapp-gmail') {
    const funnel = await p.evaluate(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      document.querySelector('#qo-c').click();
      document.querySelector('.quiz-go').click();
      await wait(900);
      const step2 = [...document.querySelectorAll('.wstep')].filter((e) => !e.hidden).map((e) => e.dataset.step);
      document.querySelectorAll('input[name="goal"]')[1].click();
      document.querySelector('.wstep[data-step="2"] [data-wiznext]').click();
      await wait(500);
      document.querySelector('input[name="gear"][value="gym"]').click();
      await wait(800);
      const res = document.querySelector('.wstep[data-step="4"]');
      const trial = document.querySelector('.trial-go').getBoundingClientRect();
      return {
        step2, resultShown: res && !res.hidden,
        verdict: document.querySelector('#resH').textContent.trim(),
        trialW: Math.round(trial.width), trialH: Math.round(trial.height),
        chip: document.querySelector('#chipv').textContent.trim(),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    if (funnel.step2[0] !== '2') FAIL(d.name, `funnel step 1 did not advance: ${JSON.stringify(funnel.step2)}`);
    if (!funnel.resultShown) FAIL(d.name, 'funnel never reached the result');
    if (funnel.verdict !== 'Þú byrjar á OPEN.') FAIL(d.name, `wrong verdict: ${funnel.verdict}`);
    if (funnel.trialH < 44) FAIL(d.name, `trial CTA too short: ${funnel.trialH}px`);
    if (funnel.overflow > 0) FAIL(d.name, `overflow appears after the funnel: ${funnel.overflow}px`);
    INFO(`${d.name} funnel: OK, chip ${funnel.chip}, trial CTA ${funnel.trialW}x${funnel.trialH}`);
    await p.evaluate(() => document.querySelector('#wiz').scrollIntoView());
    await settle(1300);
    await p.screenshot({ path: join(OUT, `${d.name}-result.png`) });
  }

  /* sticky bar behaviour and a scroll-through for overflow that only appears later */
  if (d.w < 900) {
    const sticky = await p.evaluate(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const bar = document.querySelector('#stickybar');
      const at = async (sel) => {
        const t = document.querySelector(sel).getBoundingClientRect().top + scrollY;
        scrollTo(0, t); await wait(800);
        return bar.classList.contains('is-on');
      };
      const mid = await at('#stodvarnar');
      const buy = await at('#verd');
      scrollTo(0, document.body.scrollHeight); await wait(800);
      const end = bar.classList.contains('is-on');
      const barH = Math.round(bar.getBoundingClientRect().height);
      const btn = bar.querySelector('.btn').getBoundingClientRect();
      return { mid, buy, end, barH, btnH: Math.round(btn.height) };
    });
    if (!sticky.mid) FAIL(d.name, 'sticky trial CTA never appears mid page');
    if (sticky.buy) FAIL(d.name, 'sticky CTA covers the real signup panel');
    if (sticky.end) FAIL(d.name, 'sticky CTA covers the footer');
    if (sticky.btnH < 44) FAIL(d.name, `sticky CTA button ${sticky.btnH}px`);
    INFO(`${d.name} sticky bar ${sticky.barH}px, button ${sticky.btnH}px, hides over signup and footer`);

    const late = await p.evaluate(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      let worst = 0; const who = [];
      for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) {
        scrollTo(0, y); await wait(140);
        const o = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        if (o > worst) {
          worst = o;
          who.push(...[...document.querySelectorAll('body *')]
            .filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > innerWidth + 1.5; })
            .map((e) => (e.className || e.tagName).toString().split(' ')[0]).slice(0, 3));
        }
      }
      scrollTo(0, 0);
      return { worst, who: [...new Set(who)] };
    });
    if (late.worst > 0) FAIL(d.name, `overflow ${late.worst}px appears during scroll :: ${late.who.join(', ')}`);
  }

  await p.close();
}

/* reduced motion on a phone */
{
  const p = await browser.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  await settle(1400);
  const rm = await p.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await wait(40); }
    scrollTo(0, 0); await wait(300);
    const all = [...document.querySelectorAll('main [data-rise], .wd, .race, .kvc, .tier, .stn-txt > *')];
    return {
      hidden: all.filter((e) => +getComputedStyle(e).opacity < 0.95).length,
      total: all.length,
      heroClip: getComputedStyle(document.querySelector('.hero-bg')).clipPath,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  if (rm.hidden) FAIL('reduced-motion', `${rm.hidden}/${rm.total} blocks left invisible`);
  if (rm.heroClip !== 'none') FAIL('reduced-motion', `hero frame still clipped: ${rm.heroClip}`);
  if (rm.overflow > 0) FAIL('reduced-motion', `overflow ${rm.overflow}px`);
  INFO(`reduced motion @390: ${rm.total} blocks all visible, frame open, no overflow`);
  await p.screenshot({ path: join(OUT, 'reduced-390.png'), fullPage: true });
  await p.close();
}

await browser.close();

const sec = (t, a) => (a.length ? `\n${t} (${a.length})\n` + a.map((x) => `  ${x}`).join('\n') : `\n${t}: none`);
const out = `HYROX mobile audit  ${new Date().toISOString().slice(0, 16)}
target: ${URL_}
devices: ${DEVICES.map((d) => `${d.name} ${d.w}x${d.h}@${d.dpr}`).join(' | ')}`
  + sec('FAIL', rep.fail) + sec('WARN', rep.warn) + sec('INFO', rep.info);
console.log(out);
await writeFile(join(OUT, 'report.txt'), out);
process.exit(rep.fail.length ? 1 : 0);
