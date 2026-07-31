/* Headless QA. The in-app preview pane suspends rAF when backgrounded, so any
   scroll-driven value freezes and screenshots come back black (ledger #20/#42).
   Real Chrome is the only faithful check for this page. */
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'shots');
const URL_ = process.env.QA_URL || 'http://localhost:8795/';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  userDataDir: '/private/tmp/claude-501/hyrox-qa-profile',
  args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'],
});

const report = { pass: [], fail: [], info: [] };
const ok = (n, c, d = '') => (c ? report.pass : report.fail).push(`${n}${d ? ' :: ' + d : ''}`);
const info = (n) => report.info.push(n);

async function newPage(w, h, { reduce = false, js = true } = {}) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  if (reduce) await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  /* The page sets scroll-behavior:smooth, so window.scrollTo ANIMATES and every
     probe would otherwise sample a mid-flight position on a 16000px page. QA
     needs exact positions, so pin scrolling to instant. */
  await p.evaluateOnNewDocument(() => {
    addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.scrollBehavior = 'auto';
    });
  });
  if (!js) await p.setJavaScriptEnabled(false);
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  p._errs = errs;
  return p;
}
const settle = (ms) => new Promise((r) => setTimeout(r, ms));
/* Logic tests click through the DOM: the fixed header and the sticky CTA can
   sit over a target's centre point, which is a hit-test question the mobile
   block already covers properly. */
const domClick = (p, sel) => p.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) throw new Error('no element for ' + s);
  el.click();
}, sel);

/* The Chrome profile is reused between runs, so a level persisted by an earlier
   run would leak into the "unanswered" assertions. Clear the origin ONCE here
   rather than on every navigation, which would defeat the persistence test. */
{
  const p0 = await browser.newPage();
  await p0.goto(URL_, { waitUntil: 'domcontentloaded' });
  await p0.evaluate(() => { try { localStorage.clear(); } catch {} });
  await p0.close();
}

/* ---------------- 1. desktop structure ---------------- */
{
  const p = await newPage(1440, 900);
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  await settle(700);

  ok('no console errors', p._errs.length === 0, p._errs.join(' | ').slice(0, 200));

  const s = await p.evaluate(() => {
    const h1 = document.querySelectorAll('h1');
    const secs = document.querySelectorAll('main > section');
    const imgs = [...document.images];
    return {
      h1n: h1.length,
      h1text: h1[0]?.textContent.replace(/\s+/g, ' ').trim(),
      sections: secs.length,
      sectionIds: [...secs].map((x) => x.id || x.className.split(' ')[0]),
      imgs: imgs.length,
      broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc),
      noAlt: imgs.filter((i) => !i.hasAttribute('alt')).length,
      docH: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  ok('exactly one h1', s.h1n === 1, `found ${s.h1n}`);
  ok('h1 text is clean', /^Hvar ertu núna\?$/.test(s.h1text || ''), s.h1text);
  ok('no broken images', s.broken.length === 0, s.broken.join(','));
  ok('every image has alt', s.noAlt === 0, `${s.noAlt} missing`);
  ok('no horizontal overflow @1440', s.overflow <= 0, `${s.overflow}px`);
  info(`sections: ${s.sections} (${s.sectionIds.join(', ')})`);
  info(`page height ${s.docH}px, ${s.imgs} images`);

  /* full-page shot with everything revealed */
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await settle(900);

  /* Upscale ratio: never blow an asset past its intrinsic pixels (ledger #64).
     This has to come AFTER the sweep. Everything below the fold is loading=lazy,
     so at scroll 0 naturalWidth is still 0 and the ratio is meaningless. */
  const up = await p.evaluate(async () => {
    const imgs = [...document.images];
    await Promise.all(imgs.map((i) => (i.complete ? null
      : new Promise((r) => i.addEventListener('load', r, { once: true })))));
    return {
      unloaded: imgs.filter((i) => !i.naturalWidth).length,
      over: imgs.map((i) => ({
        src: i.currentSrc.split('/').pop(),
        r: +((i.getBoundingClientRect().width * devicePixelRatio) / (i.naturalWidth || 1)).toFixed(2),
      })).filter((x) => x.r > 1.25),
    };
  });
  ok('every image actually decoded after a full sweep', up.unloaded === 0, `${up.unloaded} never loaded`);
  ok('no image upscaled past 1.25x', up.over.length === 0, JSON.stringify(up.over));
  await p.screenshot({ path: join(OUT, 'desktop-full.png'), fullPage: true });
  await p.close();
}

/* ---------------- 2. THE SIGNATURE: the funnel + level state ---------------- */
{
  const p = await newPage(1440, 1000);
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  await settle(600);

  const before = await p.evaluate(() => ({
    level: document.documentElement.dataset.level,
    chip: document.querySelector('#chipv').textContent.trim(),
    noneShown: !document.querySelector('.vd-none').hidden,
    wizShown: !document.querySelector('#wiz').hidden,
    wlvVisible: [...document.querySelectorAll('.wlv')].filter((e) => !e.hidden).length,
  }));
  ok('unanswered: no level set', before.level === '', before.level);
  ok('unanswered: chip reads Óvalið', before.chip === 'Óvalið', before.chip);
  ok('unanswered: three-level comparison shown', before.noneShown === true);
  ok('unanswered: funnel hidden', before.wizShown === false);
  ok('unanswered: all three week cards shown', before.wlvVisible === 3, String(before.wlvVisible));

  /* STEP 1 (hero) */
  await p.evaluate(() => document.querySelector('#qo-d').click());
  await domClick(p, '.quiz-go');
  await settle(1200);
  const s2 = await p.evaluate(() => ({
    level: document.documentElement.dataset.level,
    wizShown: !document.querySelector('#wiz').hidden,
    noneShown: !document.querySelector('.vd-none').hidden,
    stepShown: [...document.querySelectorAll('.wstep')].filter((e) => !e.hidden).map((e) => e.dataset.step),
    n: document.querySelector('#wizN').textContent,
    prog: getComputedStyle(document.querySelector('#wizProg')).getPropertyValue('--p').trim(),
    scrolled: window.scrollY,
  }));
  ok('step 1 -> level resolves to pro', s2.level === 'pro', s2.level);
  ok('step 1 -> funnel opens, comparison closes', s2.wizShown && !s2.noneShown);
  ok('step 1 -> lands on step 2', JSON.stringify(s2.stepShown) === '["2"]' && s2.n === '2',
    JSON.stringify(s2.stepShown));
  ok('step 2 progress bar at 50%', s2.prog === '0.500', s2.prog);
  ok('page scrolls to the funnel', s2.scrolled > 200, `${s2.scrolled}px`);

  /* STEP 2: multi-select goals */
  await p.evaluate(() => {
    document.querySelectorAll('input[name="goal"]')[1].click();
    document.querySelectorAll('input[name="goal"]')[5].click();
  });
  await domClick(p, '.wstep[data-step="2"] [data-wiznext]');
  await settle(700);
  const s3 = await p.evaluate(() => ({
    stepShown: [...document.querySelectorAll('.wstep')].filter((e) => !e.hidden).map((e) => e.dataset.step),
    n: document.querySelector('#wizN').textContent,
  }));
  ok('step 2 -> step 3', JSON.stringify(s3.stepShown) === '["3"]' && s3.n === '3',
    JSON.stringify(s3.stepShown));

  /* STEP 3: picking equipment auto-advances */
  await p.evaluate(() => document.querySelector('input[name="gear"][value="limited"]').click());
  await settle(900);
  const s4 = await p.evaluate(() => ({
    stepShown: [...document.querySelectorAll('.wstep')].filter((e) => !e.hidden).map((e) => e.dataset.step),
    verdict: document.querySelector('#resH').textContent.trim(),
    why: document.querySelector('#resWhy').textContent.trim().slice(0, 40),
    focus: document.querySelectorAll('#resFocus li').length,
    gear: document.querySelector('#resGear').textContent.trim(),
    gearHidden: document.querySelector('#resGear').hidden,
    goals: document.querySelector('#resGoals').textContent.trim(),
    goalsHidden: document.querySelector('#resGoals').hidden,
    lvName: document.querySelector('.res-lv [data-lvname]').textContent.trim(),
    prog: getComputedStyle(document.querySelector('#wizProg')).getPropertyValue('--p').trim(),
    trialCta: document.querySelector('.trial-go').getAttribute('href'),
    trialPrice: document.querySelector('.trial-num span').textContent.trim(),
  }));
  ok('step 3 -> result step', JSON.stringify(s4.stepShown) === '["4"]', JSON.stringify(s4.stepShown));
  const ring = await p.evaluate(() => {
    const h = document.querySelector('#resH');
    h.focus();
    const cs = getComputedStyle(h);
    return { focused: document.activeElement === h, w: cs.outlineWidth, style: cs.outlineStyle };
  });
  ok('result heading takes focus without painting a ring',
    ring.focused && (ring.style === 'none' || parseFloat(ring.w) === 0), JSON.stringify(ring));
  ok('result: verdict matches the level', s4.verdict === 'Þú byrjar á PRO.', s4.verdict);
  ok('result: reasoning rendered', s4.why.length > 20, s4.why);
  ok('result: focus points rendered', s4.focus === 3, String(s4.focus));
  ok('result: equipment answer is the one chosen',
    !s4.gearHidden && /Þú þarft ekki fullbúna stöð/.test(s4.gear), s4.gear.slice(0, 60));
  ok('result: chosen goals echoed back',
    !s4.goalsHidden && /bæta tímann minn/.test(s4.goals) && /keppa á móti erlendis/.test(s4.goals),
    s4.goals.slice(0, 110));
  ok('result: level badge reads PRO', s4.lvName === 'PRO', s4.lvName);
  ok('result: progress complete', s4.prog === '1.000', s4.prog);
  ok('result: CTA is the free trial', /strivee\.app\/marketplace\/plan/.test(s4.trialCta || ''), s4.trialCta);
  ok('result: trial price reads 0', s4.trialPrice === '0', s4.trialPrice);

  /* the level rewrote the rest of the page too */
  const page = await p.evaluate(() => ({
    weekLv: document.querySelector('#weekLv').textContent.trim(),
    wlvShown: [...document.querySelectorAll('.wlv')].filter((e) => !e.hidden).map((e) => e.dataset.when),
    phoneLv: document.querySelector('.ph-lv').textContent.trim(),
    closerHidden: document.querySelector('.closer-lv').hidden,
    formLv: document.querySelector('input[name="level"]:checked')?.value,
    chip: document.querySelector('#chipv').textContent.trim(),
  }));
  ok('level rewrites the week label', page.weekLv === 'PRO', page.weekLv);
  ok('level rewrites the week card', JSON.stringify(page.wlvShown) === '["pro"]', JSON.stringify(page.wlvShown));
  ok('level rewrites the app mock', page.phoneLv === 'PRO', page.phoneLv);
  ok('level reveals the closer line', page.closerHidden === false);
  ok('level preselects the signup form', page.formLv === 'pro', String(page.formLv));
  ok('level shows in the header chip', page.chip === 'PRO', page.chip);
  await p.screenshot({ path: join(OUT, 'funnel-result.png') });

  /* back through the steps keeps the answers */
  await domClick(p, '.wstep[data-step="4"] [data-wizback]');
  await settle(500);
  const backAns = await p.evaluate(() => ({
    step: [...document.querySelectorAll('.wstep')].filter((e) => !e.hidden).map((e) => e.dataset.step),
    gear: document.querySelector('input[name="gear"]:checked')?.value,
  }));
  ok('back keeps the equipment answer', backAns.step[0] === '3' && backAns.gear === 'limited',
    JSON.stringify(backAns));

  /* persistence */
  await p.reload({ waitUntil: 'networkidle0' });
  await settle(600);
  const persisted = await p.evaluate(() => document.documentElement.dataset.level);
  ok('level persists across reload', persisted === 'pro', persisted);

  /* header chip jumps straight to the result for a declared level */
  await domClick(p, '#chip');
  await settle(250);
  await domClick(p, '#chip-start');
  await settle(600);
  const swapped = await p.evaluate(() => ({
    level: document.documentElement.dataset.level,
    step: [...document.querySelectorAll('.wstep')].filter((e) => !e.hidden).map((e) => e.dataset.step),
    verdict: document.querySelector('#resH').textContent.trim(),
  }));
  ok('chip switch changes level', swapped.level === 'start', swapped.level);
  ok('chip switch jumps to the result', swapped.step[0] === '4', JSON.stringify(swapped.step));
  ok('chip switch rewrites the verdict', swapped.verdict === 'Þú byrjar á START.', swapped.verdict);

  /* starting over clears everything, not just the level */
  await p.evaluate(() => document.querySelector('.wstep[data-step="4"] [data-resetlevel]').click());
  await settle(700);
  const reset = await p.evaluate(() => ({
    level: document.documentElement.dataset.level,
    noneShown: !document.querySelector('.vd-none').hidden,
    goals: document.querySelectorAll('input[name="goal"]:checked').length,
    gear: document.querySelectorAll('input[name="gear"]:checked').length,
    quiz: document.querySelectorAll('input[name="lvl"]:checked').length,
  }));
  ok('reset clears the level', reset.level === '' && reset.noneShown === true, JSON.stringify(reset));
  ok('reset clears every funnel answer',
    reset.goals === 0 && reset.gear === 0 && reset.quiz === 0, JSON.stringify(reset));
  await p.close();
}

/* ---------------- 3. scrubbed, not one-shot ---------------- */
{
  const p = await newPage(1440, 900);
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  await settle(400);

  const read = async (y) => {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await settle(1400); // >= 7 tau at .16s (ledger #62: settle before recording)
    return p.evaluate(() => {
      const el = document.querySelector('.js-rv img');
      return {
        rv: parseFloat(getComputedStyle(el).getPropertyValue('--hx-rv')) || 0,
        t: getComputedStyle(el).transform,
      };
    });
  };
  const target = await p.evaluate(() => {
    const el = document.querySelector('.js-rv');
    return el.getBoundingClientRect().top + window.scrollY;
  });
  const a = await read(target - 900);
  const b = await read(target - 200);
  const c = await read(target - 900);
  ok('reveal advances with scroll', b.rv > a.rv + 0.05, `${a.rv} -> ${b.rv}`);
  ok('reveal is REVERSIBLE (scrubbed, not a one-shot)',
    Math.abs(c.rv - a.rv) < 0.02 && c.rv < b.rv - 0.05, `${a.rv} -> ${b.rv} -> ${c.rv}`);
  info(`reveal round trip ${a.rv} / ${b.rv} / ${c.rv}`);

  /* Frame rate over a real sweep. This measures the rAF loop, so every image is
     primed first: below the fold they are all loading=lazy now, and a sweep that
     outruns Chrome's lazy margin would otherwise be timing first-visit image
     decode instead of the motion system. */
  await p.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    await Promise.all([...document.images].map((i) => (i.complete ? null
      : new Promise((r) => i.addEventListener('load', r, { once: true })))));
    window.scrollTo(0, 0);
  });
  await settle(500);
  const perf = await p.evaluate(async () => {
    const tasks = [];
    const t0 = performance.now();
    const po = new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        tasks.push(`${Math.round(e.duration)}ms @${Math.round(e.startTime - t0)}`
          + (e.attribution || []).map((x) => ` ${x.name}`).join(''));
      }
    });
    po.observe({ entryTypes: ['longtask'] });
    let frames = 0;
    const tick = () => { frames++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const h = document.body.scrollHeight;
    for (let i = 0; i < 60; i++) {
      window.scrollTo(0, (h - innerHeight) * (i / 59));
      await new Promise((r) => setTimeout(r, 48));
    }
    await new Promise((r) => setTimeout(r, 200));
    po.disconnect();
    return { fps: +(frames / 3).toFixed(1), long: tasks.length, tasks };
  });
  ok('60fps over a full-page sweep', perf.fps >= 50, `${perf.fps} fps`);
  ok('no long tasks during sweep', perf.long === 0, perf.tasks.join(', '));
  info(`sweep: ${perf.fps} fps, ${perf.long} long tasks${perf.long ? ' [' + perf.tasks.join(', ') + ']' : ''}`);
  await p.close();
}

/* ---------------- 3a. the load sequence ------------------------------------
   The regression this exists to catch: the intro used to be applied by app.js.
   app.js is deferred and queued behind 2.9 MB of eager images, so on a throttled
   connection it ran EIGHT SECONDS after first paint. A visitor watched the hero
   paint full bleed and readable, then snap backwards into a small inset frame
   with the header gone, and only then play the opening. Measured 2026-07-31.

   Two properties are asserted, neither of them about how it looks: the frame is
   already closed on the first paint, and the whole intro still resolves if
   app.js never arrives at all. If both hold, no network condition can reorder
   the opening, because no script step is in the path. */
{
  const p = await newPage(1440, 900);
  await p.setRequestInterception(true);
  p.on('request', (r) => (/\/app\.js(\?|$)/.test(r.url()) ? r.abort() : r.continue()));
  await p.goto(URL_, { waitUntil: 'domcontentloaded' });

  await settle(120);
  const early = await p.evaluate(() => ({
    html: document.documentElement.className,
    clip: getComputedStyle(document.querySelector('.hero-bg')).clipPath,
  }));
  await settle(2400);
  const late = await p.evaluate(() => ({
    clip: getComputedStyle(document.querySelector('.hero-bg')).clipPath,
    hdr: +getComputedStyle(document.querySelector('.hdr')).opacity,
    h1: +getComputedStyle(document.querySelector('.hero-h')).opacity,
    quiz: +getComputedStyle(document.querySelector('.quiz')).opacity,
    cred: +getComputedStyle(document.querySelector('.hero-cred')).opacity,
  }));
  ok('load: the frame is closed without app.js, i.e. before first paint',
    /hx-open/.test(early.html) && /inset\(/.test(early.clip) && early.clip !== 'none',
    `html "${early.html}" :: ${early.clip.slice(0, 40)}`);
  ok('load: the intro completes with app.js blocked',
    (late.clip === 'none' || /inset\(0/.test(late.clip))
      && late.hdr > .95 && late.h1 > .95 && late.quiz > .95 && late.cred > .95,
    JSON.stringify(late));
  await p.close();
}
{
  /* and the reason app.js was starved in the first place */
  const p = await newPage(1440, 900);
  await p.goto(URL_, { waitUntil: 'domcontentloaded' });
  const imgs = await p.evaluate(() => [...document.querySelectorAll('img')].map((i) => ({
    src: i.getAttribute('src'),
    lazy: i.getAttribute('loading') === 'lazy',
    prio: i.getAttribute('fetchpriority'),
  })));
  const eager = imgs.filter((i) => !i.lazy);
  ok('load: only the hero is eager', eager.length === 1 && /hero\.webp$/.test(eager[0].src),
    eager.map((i) => i.src).join(', '));
  ok('load: the hero declares its priority', eager[0] && eager[0].prio === 'high', String(eager[0] && eager[0].prio));
  info(`images: ${imgs.length}, eager ${eager.length}, lazy ${imgs.length - eager.length}`);
  await p.close();
}

/* ---------------- 3b. the reference motion systems ---------------- */
{
  const p = await newPage(1440, 900);
  await p.goto(URL_, { waitUntil: 'networkidle0' });

  /* the frame opens */
  await settle(120);
  const introEarly = await p.evaluate(() => {
    const bg = document.querySelector('.hero-bg');
    return { cls: document.documentElement.className, clip: getComputedStyle(bg).clipPath };
  });
  await settle(2200);
  const introDone = await p.evaluate(() => {
    const bg = document.querySelector('.hero-bg');
    return {
      cls: document.documentElement.className,
      clip: getComputedStyle(bg).clipPath,
      hdr: +getComputedStyle(document.querySelector('.hdr')).opacity,
      h1: +getComputedStyle(document.querySelector('.hero-h')).opacity,
      quiz: +getComputedStyle(document.querySelector('.quiz')).opacity,
      scrollLocked: getComputedStyle(document.body).overflow === 'hidden',
    };
  });
  ok('intro: frame starts inset', /inset\(/.test(introEarly.clip) && introEarly.clip !== 'none',
    introEarly.clip.slice(0, 48));
  ok('intro: frame opens to full bleed',
    introDone.clip === 'none' || /inset\(0/.test(introDone.clip), introDone.clip.slice(0, 48));
  ok('intro: never locks scroll', introDone.scrollLocked === false);
  ok('intro: header, headline and quiz all land visible',
    introDone.hdr > .95 && introDone.h1 > .95 && introDone.quiz > .95, JSON.stringify(introDone));
  ok('intro: classes clean up', !/hx-open/.test(introDone.cls), `"${introDone.cls}"`);

  /* split-line headings */
  const split = await p.evaluate(() => {
    const el = document.querySelector('.hero-h');
    return {
      lines: el.querySelectorAll('.ln').length,
      inners: el.querySelectorAll('.ln-i').length,
      /* the accessible name must survive the split */
      text: el.textContent.replace(/\s+/g, ' ').trim(),
      masked: getComputedStyle(el.querySelector('.ln')).overflow,
      padTop: getComputedStyle(el.querySelector('.ln')).paddingTop,
    };
  });
  ok('split: headline broken into real lines', split.lines >= 2 && split.lines === split.inners,
    `${split.lines} lines`);
  ok('split: textContent stays correctly spaced', split.text === 'Hvar ertu núna?', split.text);
  ok('split: mask box has room above for Icelandic acutes',
    split.masked === 'hidden' && parseFloat(split.padTop) > 4, `${split.masked} / ${split.padTop}`);

  /* marquee reverses with scroll direction */
  const mqAt = async (y, dir) => p.evaluate(async (yy, d) => {
    for (let k = 0; k < 8; k++) { window.scrollTo(0, yy + k * 55 * d); await new Promise((r) => setTimeout(r, 45)); }
    const t = document.querySelector('#mqTrack');
    const a = parseFloat(getComputedStyle(t).getPropertyValue('--mx')) || 0;
    await new Promise((r) => setTimeout(r, 320));
    const b = parseFloat(getComputedStyle(t).getPropertyValue('--mx')) || 0;
    return b - a;
  }, y, dir);
  const mqTop = await p.evaluate(() => {
    const r = document.querySelector('.mq').getBoundingClientRect();
    return r.top + window.scrollY - innerHeight * 0.5;
  });
  const down = await mqAt(mqTop, 1);
  const up = await mqAt(mqTop + 400, -1);
  ok('marquee moves', Math.abs(down) > 3 || Math.abs(up) > 3, `down ${down.toFixed(1)} up ${up.toFixed(1)}`);
  ok('marquee REVERSES with scroll direction', Math.sign(down) !== Math.sign(up) && up > 0,
    `down ${down.toFixed(1)} up ${up.toFixed(1)}`);

  /* station counter tracks the station you are standing in */
  const counterAt = async (i) => p.evaluate(async (idx) => {
    const st = document.querySelectorAll('.stn')[idx];
    window.scrollTo(0, st.getBoundingClientRect().top + window.scrollY - innerHeight * 0.35);
    await new Promise((r) => setTimeout(r, 900));
    const c = document.querySelector('#stcount');
    return {
      n: document.querySelector('#stcountN').textContent,
      op: getComputedStyle(c).opacity,
      bar: getComputedStyle(document.querySelector('#stcountBar')).getPropertyValue('--sp').trim(),
    };
  }, i);
  const c1 = await counterAt(1);
  const c6 = await counterAt(6);
  ok('race counter shows while in the stations', +c1.op > .9 && +c6.op > .9, `${c1.op} / ${c6.op}`);
  ok('race counter advances 02 -> 07', c1.n === '02' && c6.n === '07', `${c1.n} then ${c6.n}`);
  ok('race counter bar fills', parseFloat(c6.bar) > parseFloat(c1.bar), `${c1.bar} -> ${c6.bar}`);

  /* directional plate swing: neighbours enter from opposite edges */
  const dirs = await p.evaluate(() => [...document.querySelectorAll('.stn .js-rv img')]
    .map((i) => i.style.getPropertyValue('--hx-dir').trim()));
  ok('plates alternate their entry edge', dirs.length >= 4 && dirs[0] !== dirs[1] && dirs[1] !== dirs[2],
    dirs.join(','));

  /* header retreats going down and returns going up */
  await p.evaluate(async () => {
    window.scrollTo(0, 400);
    await new Promise((r) => setTimeout(r, 200));
    for (let k = 0; k < 10; k++) { window.scrollBy(0, 160); await new Promise((r) => setTimeout(r, 40)); }
  });
  await settle(600);
  const hidden = await p.evaluate(() => document.querySelector('.hdr').classList.contains('is-away'));
  await p.evaluate(async () => {
    for (let k = 0; k < 8; k++) { window.scrollBy(0, -170); await new Promise((r) => setTimeout(r, 40)); }
  });
  await settle(600);
  const shown = await p.evaluate(() => document.querySelector('.hdr').classList.contains('is-away'));
  ok('header retreats on the way down', hidden === true);
  ok('header returns on the way up', shown === false);

  /* sticky CTA appears, then yields to the real signup panel */
  const stickyMid = await p.evaluate(async () => {
    window.scrollTo(0, document.querySelector('#stodvarnar').getBoundingClientRect().top + scrollY);
    await new Promise((r) => setTimeout(r, 700));
    return document.querySelector('#stickybar').classList.contains('is-on');
  });
  const stickyBuy = await p.evaluate(async () => {
    window.scrollTo(0, document.querySelector('#verd').getBoundingClientRect().top + scrollY);
    await new Promise((r) => setTimeout(r, 700));
    return document.querySelector('#stickybar').classList.contains('is-on');
  });
  ok('sticky trial CTA shows mid-page', stickyMid === true);
  ok('sticky CTA yields to the real signup panel', stickyBuy === false);

  /* highlight read brightens as the sentence is read */
  const hl = await p.evaluate(async () => {
    const el = document.querySelector('[data-hl]');
    const read = async (frac) => {
      const r = el.getBoundingClientRect();
      window.scrollTo(0, r.top + scrollY - innerHeight * frac);
      await new Promise((rr) => setTimeout(rr, 1200));
      const ws = [...el.querySelectorAll('.w')];
      return {
        p: +getComputedStyle(el).getPropertyValue('--hlp'),
        last: +getComputedStyle(ws[ws.length - 1]).opacity,
      };
    };
    const a = await read(0.98);
    const b = await read(0.15);
    return { a, b, words: el.querySelectorAll('.w').length };
  });
  ok('highlight read: words exist', hl.words > 20, String(hl.words));
  ok('highlight read: brightens as it is read',
    hl.b.p > hl.a.p + .2 && hl.b.last > hl.a.last + .2,
    `p ${hl.a.p}->${hl.b.p}, last word ${hl.a.last}->${hl.b.last}`);

  await p.close();
}

/* ---------------- 4. the signup form ---------------- */
{
  const p = await newPage(1440, 1000);
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  await settle(300);
  await p.evaluate(() => document.querySelector('#verd').scrollIntoView());
  await settle(300);

  await domClick(p, '.bform-go');
  await settle(200);
  let e1 = await p.evaluate(() => ({
    shown: !document.querySelector('#f-err').hidden,
    msg: document.querySelector('#f-err').textContent,
  }));
  ok('form blocks an empty submit', e1.shown === true, e1.msg);

  await p.type('#f-name', 'Jóna Þórsdóttir');
  await p.type('#f-mail', 'ekki-netfang');
  await domClick(p, '.bform-go');
  await settle(200);
  const e2 = await p.evaluate(() => document.querySelector('#f-err').textContent);
  ok('form rejects a bad email', /Netfangið/.test(e2), e2);

  await p.evaluate(() => { document.querySelector('#f-mail').value = ''; });
  await p.type('#f-mail', 'jona@example.is');
  await p.type('#f-msg', 'Stefni á Kaupmannahöfn.');
  await domClick(p, '.bform-go');
  await settle(400);
  const r = await p.evaluate(() => ({
    receipt: !document.querySelector('#receipt').hidden,
    formHidden: document.querySelector('#bform').hidden,
    name: document.querySelector('#rc-name').textContent,
    rows: [...document.querySelectorAll('#rc-list dt')].map((d) => d.textContent),
    href: document.querySelector('#rc-send').getAttribute('href'),
  }));
  ok('valid submit shows the receipt', r.receipt && r.formHidden);
  ok('receipt greets by first name', r.name === 'Jóna', r.name);
  ok('receipt lists every field', r.rows.length === 5, r.rows.join('/'));
  ok('mailto is prefilled', /^mailto:almahkara@gmail\.com\?subject=.+&body=.+/.test(r.href || ''),
    (r.href || '').slice(0, 90));

  /* snapshot: editing behind the receipt must not mutate it (ledger #25) */
  await p.evaluate(() => { document.querySelector('#f-name').value = 'BREYTT'; });
  const still = await p.evaluate(() => document.querySelector('#rc-name').textContent);
  ok('receipt is a frozen snapshot', still === 'Jóna', still);
  await p.close();
}

/* ---------------- 5. mobile ---------------- */
{
  const p = await newPage(390, 844);
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  await settle(600);

  const m = await p.evaluate(() => {
    const wide = [...document.querySelectorAll('body *')]
      .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
      .map((e) => e.className || e.tagName).slice(0, 6);
    const burger = document.querySelector('#burger');
    const br = burger.getBoundingClientRect();
    const hero = document.querySelector('.hero').getBoundingClientRect();
    /* every interactive control must clear 44px */
    const small = [...document.querySelectorAll('a.btn, button, summary, .qo, .lvpick-b, input, .f-lvo span')]
      .map((e) => ({ c: (e.className || '').toString().split(' ')[0], h: +e.getBoundingClientRect().height.toFixed(0) }))
      .filter((x) => x.h > 0 && x.h < 44);
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      wide,
      burgerVisible: br.width > 0,
      burgerHit: document.elementFromPoint(br.x + br.width / 2, br.y + br.height / 2) === burger
        || burger.contains(document.elementFromPoint(br.x + br.width / 2, br.y + br.height / 2)),
      heroH: Math.round(hero.height),
      vh: innerHeight,
      small,
    };
  });
  ok('no horizontal overflow @390', m.overflow <= 0, `${m.overflow}px :: ${m.wide.join(', ')}`);
  ok('burger is present and hittable at scroll 0', m.burgerVisible && m.burgerHit);
  ok('hero uses svh, not taller than the viewport', m.heroH <= m.vh + 2, `${m.heroH} vs ${m.vh}`);
  ok('all tap targets >= 44px', m.small.length === 0, JSON.stringify(m.small).slice(0, 240));

  /* text that spills its own box: catches long Icelandic words in narrow
     grid tracks, which no page-level overflow check would ever see */
  const spill = await p.evaluate(() => [...document.querySelectorAll('main *')]
    .filter((e) => {
      if (e.children.length) return false;                 // leaf text only
      const cs = getComputedStyle(e);
      if (cs.overflow !== 'visible' || cs.position === 'absolute') return false;
      return e.scrollWidth - e.clientWidth > 2 && e.clientWidth > 0;
    })
    .map((e) => `${e.className || e.tagName}:${e.scrollWidth}>${e.clientWidth}`)
    .slice(0, 8));
  ok('no text overflows its own box @390', spill.length === 0, spill.join(', '));

  await p.click('#burger');
  await settle(500);
  const menu = await p.evaluate(() => {
    const mm = document.querySelector('#mmenu');
    const r = mm.getBoundingClientRect();
    const cs = getComputedStyle(mm);
    const link = mm.querySelector('a');
    const lr = link.getBoundingClientRect();
    return {
      open: !mm.hidden, opacity: +cs.opacity,
      covers: r.width >= innerWidth - 1 && r.height >= innerHeight - 1,
      /* rendered inside the header would collapse it to the header box (ledger #29) */
      parentIsHeader: mm.parentElement.tagName === 'HEADER',
      linkVisible: lr.width > 0 && +getComputedStyle(link).opacity > .9,
      bodyLocked: getComputedStyle(document.body).overflow === 'hidden',
      hit: mm.contains(document.elementFromPoint(lr.x + 5, lr.y + lr.height / 2)),
    };
  });
  ok('menu opens full-screen', menu.open && menu.covers && menu.opacity > .95, JSON.stringify(menu));
  ok('menu is a header SIBLING, not a child', menu.parentIsHeader === false);
  ok('menu links actually paint and are hittable', menu.linkVisible && menu.hit);
  ok('body scroll locked while menu open', menu.bodyLocked === true);
  await p.screenshot({ path: join(OUT, 'mobile-menu.png') });

  await p.keyboard.press('Escape');
  await settle(450);
  const closed = await p.evaluate(() => document.querySelector('#mmenu').hidden);
  ok('Escape closes the menu', closed === true);

  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 55));
    }
    window.scrollTo(0, 0);
  });
  await settle(800);
  await p.screenshot({ path: join(OUT, 'mobile-full.png'), fullPage: true });
  await p.close();
}

/* ---------------- 5b. keyboard reaches everything, visibly ---------------- */
{
  const p = await newPage(1440, 900);
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  await settle(2600);

  /* Tab all the way through and assert nothing is ever focused while invisible */
  const walk = await p.evaluate(async () => {
    const bad = [];
    const seen = new Set();
    for (let i = 0; i < 140; i++) {
      const a = document.activeElement;
      if (a && a !== document.body) {
        const key = (a.className || a.tagName) + '|' + (a.textContent || '').trim().slice(0, 18);
        if (seen.has(key)) break;
        seen.add(key);
        const cs = getComputedStyle(a);
        let n = a, op = 1;
        while (n && n !== document.body) { op *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
        const r = a.getBoundingClientRect();
        if (op < 0.9 || cs.visibility === 'hidden' || (r.width < 1 && r.height < 1)) {
          bad.push(`${key} op=${op.toFixed(2)}`);
        }
      }
      const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
      document.dispatchEvent(ev);
      await new Promise((r) => setTimeout(r, 0));
      break; // real Tab is driven from the harness below
    }
    return bad;
  });
  void walk;

  const bad = [];
  await p.evaluate(() => window.scrollTo(0, 0));
  await settle(300);
  for (let i = 0; i < 70; i++) {
    await p.keyboard.press('Tab');
    const st = await p.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      let n = a, op = 1;
      while (n && n !== document.body) { op *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
      const r = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      return {
        who: ((a.className || '').toString().split(' ')[0] || a.tagName)
          + ':' + (a.textContent || '').trim().slice(0, 16),
        op: +op.toFixed(2),
        vis: cs.visibility,
        size: Math.round(r.width) + 'x' + Math.round(r.height),
        onScreen: r.bottom > -2 && r.top < innerHeight + 2,
        /* a transparent input is acceptable when its label is the visible
           control and that label shows the focus state */
        proxyVisible: (() => {
          const lab = a.closest('label');
          if (!lab) return false;
          const lr = lab.getBoundingClientRect();
          return lr.width > 20 && lr.height > 20 && getComputedStyle(lab).visibility !== 'hidden';
        })(),
      };
    });
    if (!st) continue;
    /* A native input hidden behind a styled label is fine ONLY if it still has
       real geometry and its label paints a focus indicator. Zero-size controls
       are rejected outright. */
    if (st.vis === 'hidden' || st.size === '0x0') { bad.push(`${st.who} ${st.vis} ${st.size}`); continue; }
    if (st.op < 0.9 && !st.proxyVisible) bad.push(`${st.who} op=${st.op} no visible proxy`);
  }
  ok('keyboard never lands on an invisible control', bad.length === 0, bad.slice(0, 6).join(' | '));
  await p.close();
}

/* ---------------- 6. reduced motion ---------------- */
{
  const p = await newPage(1440, 900, { reduce: true });
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  await settle(800);
  const rm = await p.evaluate(() => {
    const all = [...document.querySelectorAll('main [data-rise], .wd, .race, .kvc, .tier, .stn-txt > *')];
    const hidden = all.filter((e) => +getComputedStyle(e).opacity < .95).length;
    const heroVis = +getComputedStyle(document.querySelector('.hero-h')).opacity;
    const masked = [...document.querySelectorAll('.js-rv img')]
      .filter((e) => getComputedStyle(e).maskImage !== 'none').length;
    return { total: all.length, hidden, heroVis, masked };
  });
  ok('reduced motion: nothing left invisible', rm.hidden === 0, `${rm.hidden}/${rm.total} under .95 opacity`);
  ok('reduced motion: hero headline visible', rm.heroVis > .95, String(rm.heroVis));
  ok('reduced motion: media masks removed', rm.masked === 0, `${rm.masked} still masked`);
  await p.screenshot({ path: join(OUT, 'reduced-full.png'), fullPage: true });
  await p.close();
}

/* ---------------- 7. no JavaScript ---------------- */
{
  const p = await newPage(1440, 900, { js: false });
  await p.goto(URL_, { waitUntil: 'networkidle0' });
  await settle(400);
  const nj = await p.evaluate(() => ({
    bodyOverflow: getComputedStyle(document.body).overflow,
    heroOpacity: +getComputedStyle(document.querySelector('.hero-h')).opacity,
    /* with scripting off the <noscript> block is parsed as normal DOM */
    nojsLevels: [...document.querySelectorAll('.nojs-lv .wlv')].filter((e) => getComputedStyle(e).display !== 'none').length,
    weekLevels: [...document.querySelectorAll('.week-lv .wlv')].filter((e) => getComputedStyle(e).display !== 'none').length,
    comparison: getComputedStyle(document.querySelector('.vd-none')).display !== 'none',
    pickers: document.querySelectorAll('.vd-none .lvpick-b').length,
    navVisible: getComputedStyle(document.querySelector('.hdr-nav')).display !== 'none',
    splitsRevealed: [...document.querySelectorAll('[data-split]')]
      .every((e) => e.textContent.replace(/\s+/g, ' ').trim().length > 3),
  }));
  ok('no-JS: body is not scroll-locked', nj.bodyOverflow !== 'hidden', nj.bodyOverflow);
  ok('no-JS: hero copy visible', nj.heroOpacity > .95, String(nj.heroOpacity));
  ok('no-JS: three-level comparison renders', nj.comparison === true && nj.pickers === 3,
    `comparison ${nj.comparison}, pickers ${nj.pickers}`);
  ok('no-JS: every level description renders', nj.nojsLevels === 3 && nj.weekLevels === 3,
    `noscript ${nj.nojsLevels}, week ${nj.weekLevels}`);
  ok('no-JS: split headings still read as text', nj.splitsRevealed === true);
  ok('no-JS: navigation reachable', nj.navVisible === true);
  await p.close();
}

await browser.close();

const line = (t, a) => (a.length ? `\n${t}\n` + a.map((x) => `  ${x}`).join('\n') : '');
const out = `HYROX QA  ${new Date().toISOString().slice(0, 16)}
${report.pass.length} passed, ${report.fail.length} failed`
  + line('FAILED', report.fail)
  + line('INFO', report.info)
  + line('PASSED', report.pass);
console.log(out);
await writeFile(join(OUT, 'report.txt'), out);
process.exit(report.fail.length ? 1 : 0);
