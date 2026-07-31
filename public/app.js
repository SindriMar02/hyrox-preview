/* hyrox.is — no framework, no smooth-scroll library.
 *
 * Two things live here:
 *  1. LEVEL STATE. The hero quiz resolves to start/open/pro and the whole page
 *     rewrites to it. Without JS every level renders side by side, so the page
 *     is complete either way.
 *  2. ONE damped rAF loop. Every scroll-driven value eases toward its target
 *     with its own time constant (hero tighter than media, media tighter than
 *     parallax). The depth ordering is what reads as expensive; a single shared
 *     constant just reads greased. All reads are batched before all writes.
 */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const root = document.documentElement;
  const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');

  const body = document.body;

  /* ---- the frame opens ----------------------------------------------
     The reference locks scroll for about five seconds with cursor:wait and no
     keyboard. This does the same visual move in 1.5s and never blocks input.
     The intro itself is not run from here: an inline script in <head> sets
     `hx-open` on <html> before the first paint and CSS keyframes carry it,
     because this file is deferred and arrives long after the page has painted.
     All that is left to do is drop the class once the animations have settled,
     so a resize-driven re-split of the h1 does not inherit the intro's
     transition delays. Every animation ends on the element's resting style, so
     removing the class is invisible, and never removing it is survivable. */
  if (root.classList.contains('hx-open')) {
    setTimeout(() => root.classList.remove('hx-open'), 2600);
  }

  /* ================================================================== *
   * 1. LEVEL STATE
   * ================================================================== */
  const LV = ['start', 'open', 'pro'];
  const NAME = { start: 'START', open: 'OPEN', pro: 'PRO' };
  const KEY = 'hx.level';
  const DATA = (() => {
    try { return JSON.parse($('#hxdata').textContent); }
    catch { return { levels: {}, gear: {}, goals: {} }; }
  })();

  let level = null;
  try {
    const saved = localStorage.getItem(KEY);
    if (LV.includes(saved)) level = saved;
  } catch { /* private mode: state simply does not persist */ }

  const whenEls = $$('[data-when]');
  const nameEls = $$('[data-lvname]');
  const hasEls = $$('[data-haslevel]');
  const pickers = $$('.lvpick-b');
  const chip = $('#chip');
  const chipv = $('#chipv');
  const weekLv = $('#weekLv');

  function applyLevel(v, jumpTo) {
    level = LV.includes(v) ? v : null;
    root.dataset.level = level || '';
    try {
      if (level) localStorage.setItem(KEY, level);
      else localStorage.removeItem(KEY);
    } catch { /* ignore */ }

    whenEls.forEach((el) => {
      const w = el.dataset.when;
      const always = el.hasAttribute('data-always');
      if (w === 'none') el.hidden = Boolean(level);
      else if (w === 'wiz') el.hidden = !level;
      else el.hidden = level ? w !== level : !always;
    });

    nameEls.forEach((el) => { el.textContent = level ? NAME[level] : 'OPEN'; });
    hasEls.forEach((el) => { el.hidden = !level; });

    pickers.forEach((b) => {
      b.setAttribute('aria-checked', String(b.dataset.setlevel === level));
    });

    if (chipv) chipv.textContent = level ? NAME[level] : 'Óvalið';
    if (chip) chip.classList.toggle('is-set', Boolean(level));
    if (weekLv) weekLv.textContent = level ? NAME[level] : 'öll þrjú stigin';

    const formRadio = level && $(`[data-formlevel="${level}"]`);
    if (formRadio) formRadio.checked = true;

    if (!level) {
      /* starting over clears the whole funnel, not just the level */
      $$('input[name="goal"], input[name="gear"]').forEach((i) => { i.checked = false; });
      goStep(2, { focus: false });
    } else if (jumpTo) {
      goStep(jumpTo, { focus: false });
    } else if (step === 4) {
      renderResult();
    }

    // geometry changed, so the scroll pass needs fresh rects
    measure();
    kick();
  }

  pickers.forEach((b) => {
    /* choosing a level outright is a declaration, not a question: show the
       result straight away and let them walk back through the steps */
    b.addEventListener('click', () => applyLevel(b.dataset.setlevel, 4));
    // roving arrow keys within each radiogroup
    b.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const group = Array.from(b.closest('.lvpick').querySelectorAll('.lvpick-b'));
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const next = group[(group.indexOf(b) + dir + group.length) % group.length];
      next.focus();
      applyLevel(next.dataset.setlevel, 4);
    });
  });

  $$('[data-resetlevel]').forEach((b) => b.addEventListener('click', () => {
    applyLevel(null);
    const q = $('#quiz');
    if (q) {
      q.reset();
      $$('.qo input', q).forEach((i) => { i.checked = false; });
      q.scrollIntoView({ behavior: reduceQ.matches ? 'auto' : 'smooth', block: 'center' });
    }
  }));

  /* ---------------------------------------------------------------- *
   * THE FUNNEL. Step 1 is the hero form; steps 2 to 4 live in the
   * section below it. Every route out of it ends on the free week.
   * ---------------------------------------------------------------- */
  const quiz = $('#quiz');
  const wiz = $('#wiz');
  const wsteps = $$('.wstep');
  const wizN = $('#wizN');
  const wizProg = $('#wizProg');
  const TOTAL = 4;
  let step = 2;

  function goStep(n, { focus = true } = {}) {
    step = Math.min(Math.max(n, 2), TOTAL);
    wsteps.forEach((s) => { s.hidden = +s.dataset.step !== step; });
    if (wizN) wizN.textContent = String(step);
    if (wizProg) wizProg.style.setProperty('--p', (step / TOTAL).toFixed(3));
    if (step === TOTAL) renderResult();
    const live = wsteps.find((s) => !s.hidden);
    if (live && focus) {
      const h = live.querySelector('h2');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
    measure(); kick();
  }

  function renderResult() {
    const L = DATA.levels[level];
    if (!L) return;
    const h = $('#resH'); const why = $('#resWhy'); const focus = $('#resFocus');
    if (h) h.textContent = L.verdict;
    if (why) why.textContent = L.why;
    if (focus) {
      focus.textContent = '';
      (L.focus || []).forEach((f) => {
        const li = document.createElement('li'); li.textContent = f; focus.append(li);
      });
    }
    const gearSel = $('input[name="gear"]:checked');
    const gEl = $('#resGear');
    if (gEl) {
      gEl.textContent = gearSel ? (DATA.gear[gearSel.value] || '') : '';
      gEl.hidden = !gearSel;
    }
    const picked = $$('input[name="goal"]:checked').map((i) => DATA.goals[i.value]).filter(Boolean);
    const gl = $('#resGoals');
    if (gl) {
      if (picked.length) {
        const list = picked.length === 1
          ? picked[0].toLowerCase()
          : picked.slice(0, -1).map((x) => x.toLowerCase()).join(', ')
            + ' og ' + picked[picked.length - 1].toLowerCase();
        gl.textContent = `Þú merktir við: ${list}. Segðu þjálfurunum frá því þegar þú byrjar.`;
        gl.hidden = false;
      } else { gl.hidden = true; }
    }
  }

  if (quiz) {
    quiz.addEventListener('submit', (e) => {
      e.preventDefault();
      const picked = $('input[name="lvl"]:checked', quiz);
      if (!picked) {
        $('.qo input', quiz)?.focus();
        quiz.classList.remove('is-nudge');
        void quiz.offsetWidth;
        quiz.classList.add('is-nudge');
        return;
      }
      applyLevel(picked.value);
      goStep(2, { focus: false });
      const target = $('#nidurstada');
      if (target) {
        target.scrollIntoView({ behavior: reduceQ.matches ? 'auto' : 'smooth', block: 'start' });
        setTimeout(() => {
          const hh = $('.wstep[data-step="2"] h2');
          if (hh) { hh.setAttribute('tabindex', '-1'); hh.focus({ preventScroll: true }); }
        }, reduceQ.matches ? 0 : 560);
      }
    });
    $$('.qo input', quiz).forEach((i) => i.addEventListener('change', () => {
      quiz.classList.remove('is-nudge');
    }));
  }

  $$('[data-wiznext]').forEach((b) => b.addEventListener('click', () => {
    goStep(step + 1);
    if (wiz) wiz.scrollIntoView({ behavior: reduceQ.matches ? 'auto' : 'smooth', block: 'start' });
  }));
  $$('[data-wizback]').forEach((b) => b.addEventListener('click', () => {
    goStep(step - 1);
    if (wiz) wiz.scrollIntoView({ behavior: reduceQ.matches ? 'auto' : 'smooth', block: 'start' });
  }));
  /* picking equipment is a single choice, so it can advance on its own */
  $$('input[name="gear"]').forEach((i) => i.addEventListener('change', () => {
    setTimeout(() => goStep(4), 260);
  }));

  /* ================================================================== *
   * 2. HEADER, MENUS
   * ================================================================== */
  const hdr = $('#hdr');
  const chipmenu = $('#chipmenu');
  const burger = $('#burger');
  const mmenu = $('#mmenu');

  const closeChip = () => {
    if (!chipmenu || chipmenu.hidden) return;
    chipmenu.hidden = true;
    chip.setAttribute('aria-expanded', 'false');
  };
  if (chip && chipmenu) {
    chip.addEventListener('click', () => {
      const open = chipmenu.hidden;
      chipmenu.hidden = !open;
      chip.setAttribute('aria-expanded', String(open));
      if (open) $('.lvpick-b', chipmenu)?.focus();
    });
  }

  let menuOpen = false;
  function setMenu(open) {
    if (!mmenu || !burger) return;
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-menu', open);
    if (open) {
      mmenu.hidden = false;
      requestAnimationFrame(() => mmenu.classList.add('is-open'));
    } else {
      mmenu.classList.remove('is-open');
      const done = () => { if (!menuOpen) mmenu.hidden = true; };
      if (reduceQ.matches) done();
      else setTimeout(done, 300);
    }
  }
  if (burger) burger.addEventListener('click', () => setMenu(!menuOpen));
  if (mmenu) {
    $$('a', mmenu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (menuOpen) { setMenu(false); burger?.focus(); }
    if (chipmenu && !chipmenu.hidden) { closeChip(); chip?.focus(); }
    const d = $('.fq[open]');
    if (d && d.contains(document.activeElement)) d.open = false;
  });
  document.addEventListener('pointerdown', (e) => {
    if (chipmenu && !chipmenu.hidden
      && !chipmenu.contains(e.target) && !chip.contains(e.target)) closeChip();
  });

  /* ================================================================== *
   * 3. THE SIGNUP FORM
   * ================================================================== */
  const bform = $('#bform');
  const receipt = $('#receipt');
  if (bform && receipt) {
    const err = $('#f-err');
    const MAIL = 'almahkara@gmail.com';
    const PLAN = { vikuprufa: 'Frí vikuprufa', askrift: 'Áskrift, 7.990 kr á mánuði' };

    const show = (msg, field) => {
      err.textContent = msg;
      err.hidden = false;
      if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    };

    bform.addEventListener('submit', (e) => {
      e.preventDefault();
      err.hidden = true;
      $$('input, textarea', bform).forEach((i) => i.removeAttribute('aria-invalid'));

      const name = $('#f-name').value.trim();
      const mail = $('#f-mail').value.trim();
      if (!name) return show('Sláðu inn nafnið þitt.', $('#f-name'));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) {
        return show('Netfangið lítur ekki út fyrir að vera rétt.', $('#f-mail'));
      }

      const lvSel = $('input[name="level"]:checked', bform);
      const plan = $('input[name="plan"]:checked', bform).value;
      const msg = $('#f-msg').value.trim();

      /* snapshot at submit: the receipt must not mutate if the form behind it
         is edited afterwards */
      const data = [
        ['Nafn', name],
        ['Netfang', mail],
        ['Stig', lvSel ? NAME[lvSel.value] : 'Ekki valið'],
        ['Byrja á', PLAN[plan]],
      ];
      if (msg) data.push(['Skilaboð', msg]);

      const list = $('#rc-list');
      list.textContent = '';
      data.forEach(([k, v]) => {
        const dt = document.createElement('dt'); dt.textContent = k;
        const dd = document.createElement('dd'); dd.textContent = v;
        list.append(dt, dd);
      });
      $('#rc-name').textContent = name.split(/\s+/)[0];

      const subject = `Skráning í fjarþjálfun: ${PLAN[plan]}`;
      const body = data.map(([k, v]) => `${k}: ${v}`).join('\n');
      $('#rc-send').href =
        `mailto:${MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      bform.hidden = true;
      receipt.hidden = false;
      receipt.focus();
      measure();
    });

    $('#rc-back').addEventListener('click', () => {
      receipt.hidden = true;
      bform.hidden = false;
      $('#f-name').focus();
      measure();
    });
  }

  /* ================================================================== *
   * 4. THE DAMPED SCROLL ENGINE
   * ================================================================== */
  const chan = (tau) => ({ cur: null, tau });
  let settled = true;
  const adv = (c, tgt, dt) => {
    if (c.cur === null) { c.cur = tgt; return tgt; }
    c.cur += (tgt - c.cur) * (1 - Math.exp(-dt / c.tau));
    if (Math.abs(tgt - c.cur) < 0.0008) c.cur = tgt;
    else settled = false;
    return c.cur;
  };

  /* Blocks that rise as they cross the reading line. Reveals are welcome as
     texture; the page's actual signature is the level state, not this. */
  const RISE = [
    { sel: '.verdict .eyebrow, .vd-none > *, .vd-one > *' },
    { sel: '.week .sec-h > *, .week-ctl, .note' },
    { sel: '.wd', step: 16, cap: 6, start: 1.0, span: .12 },
    { sel: '.wlv', step: 40, cap: 3 },
    { sel: '.app-copy > *' },
    { sel: '.app-vis' },
    { sel: '.st .sec-h > *' },
    { sel: '.stn-txt > *', step: 22, cap: 3 },
    { sel: '.punch-in > *, .coach-copy > *' },
    { sel: '.races .sec-h > *, .race-foot > *' },
    { sel: '.race', step: 11, cap: 6, start: 1.02, span: .1 },
    { sel: '.kv .sec-h > *, .kv-flag' },
    { sel: '.kvc', step: 44, cap: 3 },
    { sel: '.b2b .sec-h > *, .b2b > .wrap > .btn' },
    { sel: '.tier', step: 44, cap: 3 },
    { sel: '.buy-price > *, .buy-form-w' },
    { sel: '.faq .sec-h > *' },
    { sel: '.fq', step: 14, cap: 6 },
    { sel: '.closer-in > *' },
    { sel: '.ft-a, .ft-b, .ft-c' },
  ];

  let riseEls = [];
  let scrubEls = [];
  const heroImg = $('.hero-img');
  const chHero = chan(0.09);
  const chHdr = chan(0.12);

  if (!reduceQ.matches) {
    RISE.forEach((g) => {
      const step = g.step ?? 34, cap = g.cap ?? 5;
      const start = g.start ?? 0.97, span = g.span ?? 0.14;
      $$(g.sel).forEach((el, i) => {
        el.setAttribute('data-rise', '');
        riseEls.push({
          el, stagger: Math.min(i, cap) * step, start, span,
          ch: chan(0.16), out: -1, top: 0, h: 0,
        });
      });
    });
    scrubEls = [
      ...$$('.js-rv').map((el) => {
        /* alternate the swing side down the station list, and anchor the
           transform origin to the edge the plate enters from */
        const row = el.closest('.stn');
        const dir = row ? (Array.prototype.indexOf.call(row.parentElement.children, row) % 2 ? -1 : 1) : 1;
        const im = el.querySelector('img') || el;
        im.style.setProperty('--hx-dir', String(dir));
        im.style.setProperty('--hx-org', dir > 0 ? '0%' : '100%');
        return {
          el, img: im, masked: true, amp: -20,
          chRv: chan(0.15), chPar: chan(0.22), rv: -1, par: null, top: 0, h: 0,
        };
      }),
      ...$$('.js-par').map((el) => ({
        el, img: el.querySelector('img') || el, masked: false, amp: -30,
        chRv: null, chPar: chan(0.22), rv: -1, par: null, top: 0, h: 0,
      })),
    ];
  }

  /* ---- split-line heading reveals -------------------------------------
     Lines are measured, not guessed, so they re-wrap correctly at any width.
     A collapsing space text node is left between lines so textContent and the
     accessible name stay correctly spaced (a split heading otherwise reads as
     "HvarertuNúna" to a screen reader and to a crawler). */
  const splitEls = $$('[data-split]');
  function buildSplits() {
    splitEls.forEach((el) => {
      const plain = el.dataset.plain || el.textContent.replace(/\s+/g, ' ').trim();
      el.dataset.plain = plain;
      el.textContent = '';
      const probes = plain.split(' ').map((w) => {
        const s = document.createElement('span');
        s.textContent = w;
        s.style.display = 'inline-block';
        el.append(s, document.createTextNode(' '));
        return s;
      });
      // group words by the line box they landed on
      const lines = [];
      let curTop = null;
      probes.forEach((s) => {
        const t = Math.round(s.offsetTop);
        if (curTop === null || Math.abs(t - curTop) > 3) { lines.push([]); curTop = t; }
        lines[lines.length - 1].push(s.textContent);
      });
      el.textContent = '';
      lines.forEach((words, i) => {
        const ln = document.createElement('span');
        ln.className = 'ln';
        const inner = document.createElement('span');
        inner.className = 'ln-i';
        inner.style.setProperty('--l', String(i));
        inner.textContent = words.join(' ');
        ln.append(inner);
        el.append(ln, document.createTextNode(' '));
      });
      el.classList.add('is-armed');
    });
  }
  const splitIO = 'IntersectionObserver' in window && !reduceQ.matches
    ? new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); splitIO.unobserve(e.target); }
    }), { rootMargin: '0px 0px -12% 0px' })
    : null;

  /* ---- highlight read: words light up as the line is read ---- */
  const hlEls = reduceQ.matches ? [] : $$('[data-hl]');
  hlEls.forEach((el) => {
    const plain = el.textContent.replace(/\s+/g, ' ').trim();
    const words = plain.split(' ');
    el.textContent = '';
    el.style.setProperty('--n', String(words.length));
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.style.setProperty('--i', String(i));
      s.textContent = w;
      el.append(s, document.createTextNode(' '));
    });
    el._ch = chan(0.15);
    el._out = -1;
  });

  /* ---- the reversing course marquee ---- */
  const mq = $('.mq');
  const mqTrack = $('#mqTrack');
  let mqX = 0, mqHalf = 0, mqDir = -1;

  /* ---- race instrumentation ---- */
  const stSec = $('#stodvarnar');
  const stCount = $('#stcount');
  const stCountN = $('#stcountN');
  const stCountBar = $('#stcountBar');
  const stnEls = $$('.stn');
  let stLast = -1;

  /* ---- sticky CTA + header hide ---- */
  const sticky = $('#stickybar');
  const buySec = $('#verd');
  let hdrLastY = 0, hdrAway = false;

  /* nav scrollspy */
  const navLinks = $$('.hdr-nav a');
  const navTargets = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  let spyIdx = -1;

  /* measure(): all layout reads happen here and in the read half of the loop,
     never interleaved with writes (that forces a reflow per element per frame) */
  let vh = innerHeight;
  function measure() {
    vh = innerHeight;
    const y = scrollY;
    riseEls.forEach((e) => {
      const r = e.el.getBoundingClientRect();
      e.top = r.top + y; e.h = r.height;
    });
    scrubEls.forEach((e) => {
      const r = e.el.getBoundingClientRect();
      e.top = r.top + y; e.h = r.height;
    });
  }

  /* velocity: position answers "where", this answers "how fast you are reading".
     A hard flick makes the plates hang a few px behind; the .22s position
     damping then settles them. */
  const chVel = chan(0.12);
  let prevY = scrollY;
  let last = 0;
  let running = false;

  function loop(t) {
    running = true;
    if (!last) last = t;
    const dt = Math.min((t - last) / 1000, 0.05) || 0.016;
    last = t;
    settled = true;

    const y = scrollY;
    const vRaw = clamp((y - prevY) / (dt || 0.016) / 2600, -1, 1);
    prevY = y;
    const vel = adv(chVel, vRaw, dt);

    /* ---- READ PASS (no writes yet) ---- */
    const riseVals = riseEls.map((e) => {
      const seen = y + vh - (e.top + e.stagger);
      const raw = clamp(seen / (vh * e.span + e.h * 0.22));
      return adv(e.ch, e.start <= 1 ? raw : raw, dt);
    });
    const scrubVals = scrubEls.map((e) => {
      const centre = e.top + e.h / 2 - (y + vh / 2);
      const rv = e.chRv ? adv(e.chRv, clamp((y + vh * 0.96 - e.top) / (e.h * 0.62 + vh * 0.1)), dt) : 1;
      const par = adv(e.chPar, (centre / (vh + e.h)) * e.amp * 2 + vel * e.amp * 0.45, dt);
      return { rv, par };
    });
    const heroY = heroImg ? adv(chHero, Math.min(y, vh) * 0.16, dt) : 0;
    const stuck = y > 24;

    /* ---- WRITE PASS ---- */
    riseEls.forEach((e, i) => {
      const v = +riseVals[i].toFixed(3);
      if (e.out !== v) { e.el.style.setProperty('--hx-ri', v); e.out = v; }
    });
    scrubEls.forEach((e, i) => {
      const { rv, par } = scrubVals[i];
      const rvR = +rv.toFixed(4), parR = +par.toFixed(2);
      if (e.masked && e.rv !== rvR) { e.img.style.setProperty('--hx-rv', rvR); e.rv = rvR; }
      if (e.par !== parR) { e.img.style.setProperty('--hx-par', parR + 'px'); e.par = parR; }
    });
    if (heroImg) heroImg.style.setProperty('--hx-heroY', heroY.toFixed(2) + 'px');
    if (hdr) hdr.classList.toggle('is-stuck', stuck);
    void chHdr;

    /* highlight read: words brighten as the sentence passes the reading line */
    hlEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = clamp((vh * 0.86 - r.top) / (r.height + vh * 0.24));
      const v = +adv(el._ch, p, dt).toFixed(3);
      if (el._out !== v) { el.style.setProperty('--hlp', v); el._out = v; }
    });

    /* the marquee reverses with the direction of travel, the way the
       reference's does, and only runs while it is actually on screen */
    if (mqTrack && mq) {
      const r = mq.getBoundingClientRect();
      if (r.bottom > -80 && r.top < vh + 80) {
        if (!mqHalf) mqHalf = mqTrack.scrollWidth / 2;
        if (vel < -0.015) mqDir = 1;
        else if (vel > 0.015) mqDir = -1;
        mqX += (mqDir * 42 + vel * -560) * dt;
        if (mqHalf) {
          if (mqX <= -mqHalf) mqX += mqHalf;
          else if (mqX > 0) mqX -= mqHalf;
        }
        mqTrack.style.setProperty('--mx', mqX.toFixed(2) + 'px');
        settled = false; // a continuous band keeps the loop alive while visible
      }
    }

    /* which station you are standing in */
    if (stSec && stCount) {
      const r = stSec.getBoundingClientRect();
      const on = r.top < vh * 0.4 && r.bottom > vh * 0.5;
      stCount.style.setProperty('--hx-sc', on ? '1' : '0');
      if (on && stnEls.length) {
        let idx = 0;
        for (let i = 0; i < stnEls.length; i++) {
          if (stnEls[i].getBoundingClientRect().top <= vh * 0.55) idx = i;
        }
        if (idx !== stLast) {
          stCountN.textContent = String(idx + 1).padStart(2, '0');
          stCountBar.style.setProperty('--sp', ((idx + 1) / stnEls.length).toFixed(3));
          stLast = idx;
        }
      }
    }

    /* sticky CTA: after the hero, but never covering the real signup panel */
    if (sticky) {
      const past = y > vh * 0.9;
      const buyR = buySec ? buySec.getBoundingClientRect() : null;
      const overBuy = buyR ? buyR.top < vh && buyR.bottom > 0 : false;
      const atEnd = y + vh > document.body.scrollHeight - 240;
      sticky.classList.toggle('is-on', past && !overBuy && !atEnd);
    }

    /* header retreats going down, returns going up */
    if (hdr) {
      const dy = y - hdrLastY;
      if (Math.abs(dy) > 5) {
        const away = dy > 0 && y > vh * 0.75 && !menuOpen;
        if (away !== hdrAway) { hdr.classList.toggle('is-away', away); hdrAway = away; }
        hdrLastY = y;
      }
    }

    /* scrollspy: last section whose top has passed a third of the viewport */
    if (navTargets.length) {
      let idx = -1;
      for (let i = 0; i < navTargets.length; i++) {
        if (navTargets[i].getBoundingClientRect().top <= vh * 0.34) idx = i;
      }
      if (idx !== spyIdx) {
        navLinks.forEach((a, i) => a.classList.toggle('is-here', i === idx));
        spyIdx = idx;
      }
    }

    if (!settled) requestAnimationFrame(loop);
    else { running = false; last = 0; }
  }

  function kick() {
    if (running || reduceQ.matches) return;
    last = 0;
    requestAnimationFrame(loop);
  }

  if (!reduceQ.matches && splitEls.length) {
    /* line boxes depend on the loaded face, so build once now for a fast first
       paint and rebuild when the real font lands or the width changes */
    buildSplits();
    splitEls.forEach((el) => splitIO && splitIO.observe(el));
    const rebuild = () => {
      const w = innerWidth;
      if (rebuild._w === w) return;
      rebuild._w = w;
      splitEls.forEach((el) => { el.classList.remove('is-armed', 'is-in'); });
      buildSplits();
      splitEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight * 0.94) el.classList.add('is-in');
        else if (splitIO) splitIO.observe(el);
      });
    };
    rebuild._w = innerWidth;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { rebuild._w = -1; rebuild(); measure(); kick(); });
    }
    addEventListener('resize', rebuild, { passive: true });
  }

  if (!reduceQ.matches) {
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', () => { measure(); kick(); }, { passive: true });
    /* fonts and images change layout after first paint; re-measure when they land */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); kick(); });
    addEventListener('load', () => { measure(); kick(); });
    /* Coalesced, because the twelve lazy plates land in a burst WHILE the
       visitor is scrolling and measure() is a forced layout over the whole
       17000px page. One pass per burst instead of one per image: measured as
       the difference between a long task mid-sweep and none. */
    let remeasureT = 0;
    const remeasureSoon = () => {
      clearTimeout(remeasureT);
      remeasureT = setTimeout(() => { measure(); kick(); }, 120);
    };
    $$('img').forEach((im) => {
      if (!im.complete) im.addEventListener('load', remeasureSoon, { once: true });
    });
    measure();
    kick();
  }

  /* Tabbing ahead of the scroll: pin whatever contains focus to its resting
     state so nothing is ever focused while invisible. The browser scrolls it
     into view, and the scrubbed value catches up on the next frames. */
  const RISE_SEL = '[data-rise], .wd, .race, .kvc, .tier';
  let focusPinned = null;
  document.addEventListener('focusin', (e) => {
    const host = e.target.closest && e.target.closest(RISE_SEL);
    if (focusPinned && focusPinned !== host) focusPinned.classList.remove('has-focus');
    if (host) { host.classList.add('has-focus'); focusPinned = host; }
    else focusPinned = null;
  });
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (focusPinned && !focusPinned.contains(document.activeElement)) {
        focusPinned.classList.remove('has-focus');
        focusPinned = null;
      }
    }, 0);
  });

  /* details/summary height animation without fighting the native toggle */
  $$('.fq').forEach((d) => d.addEventListener('toggle', () => { measure(); kick(); }));

  /* apply any restored level once every handler is wired */
  applyLevel(level);
})();
