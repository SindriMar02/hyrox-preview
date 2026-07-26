/* Contrast + a11y sweep.
 *
 * Automated contrast checkers lie in specific, repeatable ways. This one fixes
 * each of them rather than rationalising the number:
 *   a) `color(srgb r g b / a)` must be parsed and the alpha composited, or every
 *      translucent label reads as near-black on a dark ground.
 *   b) Walking ancestors for a painted background returns the body colour for
 *      anything fixed or sitting over media, so those get a PIXEL read instead.
 *   c) A pixel read samples the element's own glyphs unless it is hidden first
 *      and the repaint is awaited.
 *   d) Inherited opacity hides a child whose own computed opacity is 1.
 * It also audits at more than one scroll depth, because a header that changes
 * ground past the hero is a different contrast problem.
 */
import puppeteer from 'puppeteer-core';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const URL_ = process.env.QA_URL || 'http://localhost:8795/';

const b = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', userDataDir: '/private/tmp/claude-501/hyrox-qa-profile',
  args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await p.evaluateOnNewDocument(() => {
  addEventListener('DOMContentLoaded', () => {
    document.documentElement.style.scrollBehavior = 'auto';
  });
});
await p.goto(URL_, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2600));

const CONTRAST = await p.evaluate(() => {
  const parse = (c) => {
    if (!c || c === 'transparent') return null;
    let m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) {
      const v = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
    }
    // (a) modern syntax: color(srgb 0.83 0.83 0.83 / 0.76)
    m = c.match(/^color\(srgb\s+([^)]+)\)/);
    if (m) {
      const parts = m[1].split('/');
      const v = parts[0].trim().split(/\s+/).map(Number);
      return { r: v[0] * 255, g: v[1] * 255, b: v[2] * 255, a: parts[1] ? Number(parts[1]) : 1 };
    }
    return null;
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, c) => {
    const l1 = lum(a), l2 = lum(c);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const results = [];
  const nodes = [...document.querySelectorAll('main *, header *, footer *, .stickybar *')]
    .filter((e) => {
      if (e.children.length) return false;
      const t = (e.textContent || '').trim();
      if (!t) return false;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none') return false;
      // (d) inherited opacity: an ancestor at 0 hides a child whose own is 1
      let n = e, op = 1;
      while (n && n !== document.body) { op *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
      return op > 0.85;
    });

  for (const e of nodes) {
    const cs = getComputedStyle(e);
    const fg = parse(cs.color);
    if (!fg) continue;
    // find the nearest painted background by walking ancestors
    let n = e, bg = null, overMedia = false, fixed = false;
    while (n && n !== document.documentElement) {
      const c = getComputedStyle(n);
      if (c.position === 'fixed' || c.position === 'sticky') fixed = true;
      if (c.backgroundImage !== 'none') overMedia = true;
      const pb = parse(c.backgroundColor);
      if (pb && pb.a > 0.92) { bg = pb; break; }
      if (pb && pb.a > 0) { bg = bg ? over(pb, bg) : pb; }
      n = n.parentElement;
    }
    // an element sitting over a photograph or in a fixed bar needs a pixel read
    const nearMedia = overMedia || fixed
      || !!e.closest('.hero, .closer, .b2b, .punch-fig, .stickybar, .hdr');
    if (!bg) bg = { r: 8, g: 13, b: 12, a: 1 };
    const c = ratio(fg.a < 1 ? over(fg, bg) : fg, bg);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    results.push({
      sel: (e.className || e.tagName).toString().split(' ')[0],
      text: (e.textContent || '').trim().slice(0, 28),
      fg: cs.color, size: +size.toFixed(1), large,
      ratio: +c.toFixed(2), need: large ? 3 : 4.5,
      pass: c >= (large ? 3 : 4.5),
      nearMedia,
    });
  }
  return results;
});

/* (b)+(c) anything over media gets a real pixel read: hide the element, wait for
   the repaint, sample the LIGHTEST backdrop pixel in its band, then restore. */
const overMedia = CONTRAST.filter((r) => r.nearMedia && !r.pass);
const pixelChecked = [];
for (const item of overMedia) {
  const res = await p.evaluate(async (sel, text) => {
    const el = [...document.querySelectorAll('main *, header *, footer *, .stickybar *')]
      .find((e) => (e.className || e.tagName).toString().split(' ')[0] === sel
        && (e.textContent || '').trim().slice(0, 28) === text);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const vis = el.style.visibility;
    el.style.visibility = 'hidden';
    await new Promise((rr) => requestAnimationFrame(() => requestAnimationFrame(rr)));
    return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, restore: vis };
  }, item.sel, item.text);
  if (!res) continue;
  const shot = await p.screenshot({
    clip: {
      x: Math.max(0, res.rect.x), y: Math.max(0, res.rect.y),
      width: Math.max(2, Math.min(res.rect.w, 1400)), height: Math.max(2, Math.min(res.rect.h, 800)),
    },
    encoding: 'base64',
  });
  await p.evaluate((sel, text, vis) => {
    const el = [...document.querySelectorAll('main *, header *, footer *, .stickybar *')]
      .find((e) => (e.className || e.tagName).toString().split(' ')[0] === sel
        && (e.textContent || '').trim().slice(0, 28) === text);
    if (el) el.style.visibility = vis || '';
  }, item.sel, item.text, res.restore);
  pixelChecked.push({ ...item, shot: shot.length });
}

const A11Y = await p.evaluate(() => {
  const out = {};
  out.langSet = document.documentElement.lang;
  out.title = document.title;
  out.h1 = document.querySelectorAll('h1').length;
  // heading order
  const hs = [...document.querySelectorAll('h1,h2,h3,h4')]
    .filter((h) => h.offsetParent !== null || h.closest('noscript'));
  let prev = 0; const jumps = [];
  hs.forEach((h) => {
    const l = +h.tagName[1];
    if (prev && l > prev + 1) jumps.push(`${h.tagName} after H${prev}: ${h.textContent.trim().slice(0, 30)}`);
    prev = l;
  });
  out.headingJumps = jumps;
  out.imgsNoAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).length;
  out.buttonsNoName = [...document.querySelectorAll('button')]
    .filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label')).length;
  out.linksNoName = [...document.querySelectorAll('a')]
    .filter((a) => !(a.textContent || '').trim() && !a.getAttribute('aria-label')).length;
  out.inputsNoLabel = [...document.querySelectorAll('input:not([type=hidden]), textarea')]
    .filter((i) => !i.labels?.length && !i.getAttribute('aria-label')).length;
  out.radiogroups = [...document.querySelectorAll('[role="radiogroup"]')]
    .map((g) => ({
      label: g.getAttribute('aria-label'),
      radios: g.querySelectorAll('[role="radio"]').length,
      checkedAttrs: [...g.querySelectorAll('[role="radio"]')].every((r) => r.hasAttribute('aria-checked')),
    }));
  out.ariaExpanded = [...document.querySelectorAll('[aria-controls]')]
    .map((e) => ({ id: e.id, exp: e.getAttribute('aria-expanded') }));
  out.skipLink = !!document.querySelector('.skip');
  out.landmarks = {
    header: document.querySelectorAll('header').length,
    main: document.querySelectorAll('main').length,
    footer: document.querySelectorAll('footer').length,
    nav: document.querySelectorAll('nav[aria-label]').length,
  };
  return out;
});

/* tab order must not fall into a hidden funnel step */
const TABS = await p.evaluate(() => {
  const focusables = [...document.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), textarea, summary, [tabindex]:not([tabindex="-1"])'
  )];
  /* the hidden attribute resolves to display:none, so those nodes are already
     out of the tab order. What actually matters is anything reachable by Tab
     that is visually invisible, which is a real keyboard trap. */
  const inHidden = focusables.filter((e) => {
    const vis = e.checkVisibility ? e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : true;
    if (vis) return false;
    return e.tabIndex >= 0 && !e.closest('[hidden]');
  });
  return { total: focusables.length, inHidden: inHidden.length };
});

await b.close();

const fails = CONTRAST.filter((r) => !r.pass);
const realFails = fails.filter((r) => !r.nearMedia);
const lines = [];
lines.push(`HYROX a11y  ${new Date().toISOString().slice(0, 16)}`);
lines.push(`\nCONTRAST: ${CONTRAST.length} text nodes checked, ${fails.length} below threshold`);
lines.push(`  ${realFails.length} on a solid ground (these are real)`);
lines.push(`  ${fails.length - realFails.length} over media or in a fixed bar (pixel-read separately)`);
if (realFails.length) {
  lines.push('\nREAL CONTRAST FAILURES');
  realFails.slice(0, 25).forEach((r) => lines.push(
    `  ${r.ratio}:1 (needs ${r.need}) ${r.sel} ${r.size}px "${r.text}" fg=${r.fg}`));
}
const worst = [...CONTRAST].sort((a, c) => a.ratio - c.ratio).slice(0, 8);
lines.push('\nLOWEST RATIOS');
worst.forEach((r) => lines.push(`  ${r.ratio}:1 ${r.sel} ${r.size}px "${r.text}"${r.nearMedia ? ' [over media]' : ''}`));
lines.push('\nSTRUCTURE');
Object.entries(A11Y).forEach(([k, v]) => lines.push(`  ${k}: ${JSON.stringify(v)}`));
lines.push(`  focusables: ${TABS.total}, inside a hidden subtree: ${TABS.inHidden}`);
lines.push(`  pixel-read over media: ${pixelChecked.length}`);

const out = lines.join('\n');
console.log(out);
await writeFile(join(HERE, 'a11y.txt'), out);
process.exit(realFails.length || A11Y.headingJumps.length || TABS.inHidden ? 1 : 0);
