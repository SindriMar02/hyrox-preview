import {
  META, LEVELS, QUIZ, WEEK, STATIONS, PRICING, COACHES, RACES, FAQ,
  KVEDJUR, CONTACT, NAV, PHOTO_CREDIT, MARQUEE, LICENCE,
} from './content.mjs';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const LV = ['start', 'open', 'pro'];

/* The wordmark, rebuilt as vector. The current site ships a stretched raster
   HYROX logo with JPEG artifacts next to a second thumbnail logo; this is one
   mark, drawn, that scales. The dot is the volt station marker. */
const wordmark = (id = 'wm') => `
<svg class="wm" viewBox="0 0 232 34" role="img" aria-labelledby="${id}t" focusable="false">
  <title id="${id}t">Hyrox.is</title>
  <g class="wm-t" fill="currentColor">
    <path d="M0 2h6.6v11.4h11.2V2h6.6v30h-6.6V19.4H6.6V32H0z"/>
    <path d="M28.2 2h7.1l6.4 12.6L48.1 2h7.1L44.9 21.2V32h-6.6V21.2z"/>
    <g transform="translate(-35.1 0)">
      <path d="M91.6 2h11.9c6.7 0 10.8 3.7 10.8 9.6 0 4.2-2.1 7.3-5.7 8.7l6.6 11.7h-7.4l-5.7-10.6h-3.9V32h-6.6zm6.6 5.7v8h4.7c2.8 0 4.5-1.5 4.5-4s-1.7-4-4.5-4z"/>
    </g>
    <g transform="translate(27.9 0)">
      <path d="M71.4 1.4c8.9 0 15 6.6 15 15.6S80.3 32.6 71.4 32.6 56.5 26 56.5 17s6-15.6 14.9-15.6zm0 6c-4.9 0-8.1 3.8-8.1 9.6s3.2 9.6 8.1 9.6 8.1-3.8 8.1-9.6-3.2-9.6-8.1-9.6z"/>
    </g>
    <path d="M118.6 2h7.6l5.6 9.7 5.6-9.7h7.6l-9.4 14.7L145.4 32h-7.7l-5.9-10.3L125.9 32h-7.7l9.8-15.3z"/>
  </g>
  <circle class="wm-dot" cx="155" cy="28.5" r="3.4" fill="var(--hx-volt)"/>
  <g class="wm-s" fill="currentColor">
    <path d="M167 8.6h6v23.4h-6zM167 0h6v6h-6z"/>
    <path d="M196.6 15.5c-.5-1.9-2-3-4.4-3-2.2 0-3.6.9-3.6 2.3 0 1.2.8 1.9 2.8 2.4l4 1c4.7 1.2 6.9 3.4 6.9 7.1 0 4.6-3.9 7.4-9.9 7.4-6.3 0-10.2-2.9-10.8-7.9h5.9c.4 2.1 2.1 3.3 4.9 3.3 2.5 0 4-1 4-2.5 0-1.2-.9-2-3-2.5l-4-1c-4.5-1.1-6.6-3.3-6.6-6.9 0-4.4 3.8-7.2 9.4-7.2 5.7 0 9.4 2.7 10 7.5z"/>
  </g>
</svg>`;

const levelPicker = (idPrefix, size = '') => `
<div class="lvpick ${size}" role="radiogroup" aria-label="Erfiðleikastig">
  ${LV.map((k) => `
  <button type="button" class="lvpick-b" role="radio" aria-checked="false"
          data-setlevel="${k}" id="${idPrefix}-${k}">
    <span class="lvpick-n">${esc(LEVELS[k].name)}</span>
    <span class="lvpick-t">${esc(LEVELS[k].tag)}</span>
  </button>`).join('')}
</div>`;

const img = (name, alt, cls = '', extra = '') => {
  /* Intrinsic dimensions, so nothing shifts while the image loads. The station
     frames render at aspect-ratio 4/3, so their assets are 4:3 landscape at
     1600x1200: a portrait asset in that frame threw away 44% of its pixels and
     upscaled on any modern phone. */
  const sizes = { hero: [2000, 1125], lanes: [1800, 1000], grid: [1600, 900], ropes: [1400, 900],
    markers: [1200, 1200], 'arch-rowing': [1200, 1500],
    'arch-sled': [1400, 900], community: [2000, 1000], finish: [1600, 1000],
    coaches: [1440, 1800] };
  const [w, h] = sizes[name] || [1600, 1200];
  return `<img src="img/${name}.webp" alt="${esc(alt)}" width="${w}" height="${h}" class="${cls}" ${extra}>`;
};

export function render({ noindex = false, previewOrigin = '' } = {}) {
  const canonical = previewOrigin || 'https://hyrox.is/';

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Hyrox.is fjarþjálfun',
    serviceType: 'Fjarþjálfun fyrir Hyrox',
    areaServed: 'IS',
    provider: {
      '@type': 'Organization',
      name: 'Hyrox.is', url: canonical,
      sameAs: [CONTACT.igUrl, CONTACT.fbUrl],
    },
    offers: {
      '@type': 'Offer', price: '7990', priceCurrency: 'ISK',
      description: 'Fjarþjálfun, 5 æfingar í viku í þremur erfiðleikastigum.',
      url: canonical,
    },
  };

  return `<!doctype html>
<html lang="is" data-level="">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(META.title)}</title>
<meta name="description" content="${esc(META.description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(META.title)}">
<meta property="og:description" content="${esc(META.description)}">
<meta property="og:locale" content="is_IS">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(canonical.replace(/\/?$/, '/'))}img/hero.webp">
<meta name="theme-color" content="#080D0C">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon-48.png" type="image/png" sizes="48x48">
<link rel="icon" href="favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preload" as="font" type="font/woff2" href="fonts/archivo-900.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="fonts/archivo-400.woff2" crossorigin>
<link rel="preload" as="image" href="img/hero.webp" fetchpriority="high">
<link rel="stylesheet" href="styles.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body class="is-loading">
<a class="skip" href="#efni">Fara beint í efni</a>

<header class="hdr" id="hdr">
  <a class="hdr-mark" href="#top" aria-label="Hyrox.is, efst á síðu">${wordmark('h')}</a>

  <nav class="hdr-nav" aria-label="Aðalvalmynd">
    ${NAV.map((n) => `<a href="${n.href}">${esc(n.label)}</a>`).join('')}
  </nav>

  <div class="hdr-right">
    <button type="button" class="chip" id="chip" aria-expanded="false" aria-controls="chipmenu">
      <span class="chip-l">Þitt stig</span>
      <span class="chip-v" id="chipv">Óvalið</span>
    </button>
    <a class="btn btn-v hdr-cta" href="#verd">Vikuprufa</a>
    <button type="button" class="burger" id="burger" aria-expanded="false" aria-controls="mmenu">
      <span class="burger-b"></span><span class="burger-b"></span>
      <span class="sr">Valmynd</span>
    </button>
  </div>

  <div class="chipmenu" id="chipmenu" hidden>
    <p class="chipmenu-h">Veldu stig. Síðan uppfærist strax.</p>
    ${levelPicker('chip', 'sm')}
  </div>
</header>

<div class="mmenu" id="mmenu" hidden>
  <nav class="mmenu-nav" aria-label="Valmynd">
    ${NAV.map((n, i) => `<a href="${n.href}" style="--i:${i}">${esc(n.label)}</a>`).join('')}
  </nav>
  <div class="mmenu-foot">
    <a class="btn btn-v" href="#verd">Byrja á frírri vikuprufu</a>
    <a class="mmenu-mail" href="mailto:${CONTACT.email}">${CONTACT.email}</a>
  </div>
</div>

<main id="efni">

<!-- 1. HERO = THE QUIZ ------------------------------------------------- -->
<section class="hero" id="top">
  <div class="hero-bg">
    ${img('hero', 'Tóm Hyrox keppnisbraut fyrir mót, með boga yfir fyrstu stöð merktan SKIERG 01', 'hero-img', 'fetchpriority="high" decoding="async"')}
    <div class="hero-scrim"></div>
  </div>

  <div class="hero-in">
    <div class="hero-copy">
      <p class="eyebrow">Fjarþjálfun sniðin að Hyrox</p>
      <h1 class="hero-h" data-split>${esc(QUIZ.question)}</h1>
      <p class="hero-lede">${esc(QUIZ.lede)} <span class="hero-lede-b">${esc(QUIZ.ledeB)}</span></p>
    </div>

    <form class="quiz" id="quiz" novalidate>
      <fieldset class="quiz-fs">
        <legend class="sr">${esc(QUIZ.question)}</legend>
        <div class="quiz-head">
          <span class="quiz-badge">${esc(QUIZ.badge)}</span>
          <span class="quiz-step" aria-hidden="true">Skref <b>1</b> af ${QUIZ.steps}</span>
        </div>
        <div class="prog" aria-hidden="true"><i style="--p:.25"></i></div>
        <div class="quiz-opts">
          ${QUIZ.options.map((o, i) => `
          <label class="qo">
            <input type="radio" name="lvl" value="${o.level}" id="qo-${o.id}" data-i="${i}">
            <span class="qo-n" aria-hidden="true">0${i + 1}</span>
            <span class="qo-l">${esc(o.label)}</span>
            <span class="qo-tick" aria-hidden="true"></span>
          </label>`).join('')}
        </div>
        <button class="btn btn-v quiz-go" type="submit">${esc(QUIZ.cta)}</button>
        <p class="quiz-foot">Engin greiðsla og ekkert kort á þessu skrefi.</p>
      </fieldset>
    </form>
  </div>

  <p class="hero-cred">${esc(PHOTO_CREDIT.event)}</p>
</section>

<!-- 2. VERDICT ---------------------------------------------------------- -->
<section class="verdict" id="nidurstada">
  <div class="wrap">

    <!-- unanswered: the three levels side by side, which is also the no-JS view -->
    <div class="vd-none" data-when="none">
      <p class="eyebrow eyebrow-v">Þrjú stig</p>
      <h2 class="h2" data-split>Sama vika, þrjár útfærslur.</h2>
      <p class="lede">Prógrammið er gefið út í þremur erfiðleikastigum svo hver og einn
        getur aðlagað þjálfunina eftir getu. Svaraðu spurningunni að ofan, eða veldu
        stig beint hér.</p>
      ${levelPicker('vd')}
    </div>

    <!-- answered: steps 2 to 4 of the funnel -->
    <div class="wiz" id="wiz" data-when="wiz" hidden>
      <div class="wiz-bar">
        <p class="eyebrow eyebrow-v">${esc(QUIZ.done.eyebrow)}</p>
        <p class="wiz-count">Skref <b id="wizN">2</b> af ${QUIZ.steps}</p>
      </div>
      <div class="prog"><i id="wizProg" style="--p:.5"></i></div>

      <!-- step 2 -->
      <div class="wstep" data-step="2">
        <h2 class="h2">${esc(QUIZ.goals.q)}</h2>
        <p class="lede">${esc(QUIZ.goals.hint)}</p>
        <fieldset class="pills">
          <legend class="sr">${esc(QUIZ.goals.q)}</legend>
          ${QUIZ.goals.items.map((g) => `
          <label class="pill">
            <input type="checkbox" name="goal" value="${g.id}">
            <span>${esc(g.label)}</span>
          </label>`).join('')}
        </fieldset>
        <div class="wiz-nav">
          <button type="button" class="btn btn-v" data-wiznext>Áfram</button>
          <button type="button" class="btn btn-ghost" data-resetlevel>${esc(QUIZ.reset)}</button>
        </div>
      </div>

      <!-- step 3 -->
      <div class="wstep" data-step="3" hidden>
        <h2 class="h2">${esc(QUIZ.gear.q)}</h2>
        <p class="lede">${esc(QUIZ.gear.hint)}</p>
        <fieldset class="gears">
          <legend class="sr">${esc(QUIZ.gear.q)}</legend>
          ${QUIZ.gear.items.map((g) => `
          <label class="gear">
            <input type="radio" name="gear" value="${g.id}">
            <span class="gear-l">${esc(g.label)}</span>
            <span class="gear-n">${esc(g.note)}</span>
          </label>`).join('')}
        </fieldset>
        <div class="wiz-nav">
          <button type="button" class="btn btn-v" data-wiznext>Sjá niðurstöðu</button>
          <button type="button" class="btn btn-ghost" data-wizback>Til baka</button>
        </div>
      </div>

      <!-- step 4: the result. Always lands on the free week. -->
      <div class="wstep wstep-done" data-step="4" hidden>
        <div class="res">
          <div class="res-a">
            <p class="res-lv"><span class="vd-lv" data-lvname>OPEN</span></p>
            <h2 class="h2" id="resH">Þú byrjar á OPEN.</h2>
            <p class="lede" id="resWhy"></p>
            <ul class="vd-focus" id="resFocus"></ul>
            <p class="res-gear" id="resGear"></p>
            <p class="res-goals" id="resGoals" hidden></p>
          </div>

          <aside class="trial">
            <p class="trial-tag">${esc(QUIZ.done.trial)}</p>
            <p class="trial-num"><span>0</span> kr</p>
            <p class="trial-b">${esc(QUIZ.done.trialBody)}</p>
            <a class="btn btn-v btn-lg trial-go" href="${CONTACT.trialUrl}"
               target="_blank" rel="noopener">${esc(QUIZ.done.trialCta)}</a>
            <a class="trial-sub" href="#verd">${esc(QUIZ.done.subCta)}</a>
            <p class="trial-then">Eftir vikuna kostar áskriftin 7.990 kr á mánuði og þú
              getur sagt henni upp hvenær sem er.</p>
          </aside>
        </div>
        <div class="wiz-nav">
          <button type="button" class="btn btn-ghost" data-wizback>${esc(QUIZ.done.backCta)}</button>
          <button type="button" class="btn btn-ghost" data-resetlevel>${esc(QUIZ.reset)}</button>
        </div>
      </div>
    </div>

    <!-- no-JS: every level still reads in full -->
    <noscript>
      <div class="nojs-lv">
        ${LV.map((k) => `
        <div class="wlv">
          <p class="wlv-n">${esc(LEVELS[k].name)}</p>
          <p class="wlv-why">${esc(LEVELS[k].why)}</p>
        </div>`).join('')}
      </div>
    </noscript>
  </div>
</section>

<!-- 3. VIKAN / the signature -------------------------------------------- -->
<section class="week" id="vikan">
  <div class="wrap">
    <header class="sec-h">
      <p class="eyebrow">Það sem þú kaupir</p>
      <h2 class="h2" data-split>Vikan þín</h2>
      <p class="lede">Fimm skipulagðar æfingar. Þrjár lyftinga- og Hyrox æfingar og tvær
        hlaupaæfingar, allar með liðkun og upphitun. Öll vikan birtist í appinu á sunnudegi.</p>
    </header>

    <div class="week-ctl">
      ${levelPicker('wk')}
      <p class="week-now">Sýnir <strong id="weekLv">öll þrjú stigin</strong></p>
    </div>

    <ol class="week-list">
      ${WEEK.map((d, i) => `
      <li class="wd wd-${d.kind}" style="--i:${i}">
        <span class="wd-day"><span class="wd-short">${esc(d.short)}</span><span class="wd-full">${esc(d.day)}</span></span>
        <span class="wd-body">
          <span class="wd-title">${esc(d.title)}</span>
          <span class="wd-text">${esc(d.body)}</span>
        </span>
        <span class="wd-kind" aria-hidden="true">${
          d.kind === 'run' ? 'hlaup' : d.kind === 'lift' ? 'lyftingar' : d.kind === 'drop' ? 'birting' : 'hvíld'
        }</span>
      </li>`).join('')}
    </ol>

    <div class="week-lv">
      ${LV.map((k) => `
      <div class="wlv" data-when="${k}" data-always>
        <p class="wlv-n">${esc(LEVELS[k].name)}</p>
        <ul class="wlv-f">${LEVELS[k].focus.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      </div>`).join('')}
    </div>

    <p class="note">Uppbygging vikunnar er byggð á frírri vikuprufu Hyrox.is, sem er með
      lyftingaæfingar á mánudegi, miðvikudegi og föstudegi og hlaupaæfingu á laugardegi.
      Nákvæm staðsetning seinni hlaupaæfingarinnar er dæmi.</p>
  </div>
</section>

<!-- 4. APPID ------------------------------------------------------------ -->
<section class="app" id="appid">
  <div class="wrap app-in">
    <div class="app-copy">
      <p class="eyebrow">Mælanlegur árangur</p>
      <h2 class="h2" data-split>Appið heldur utan um framvinduna</h2>
      <p class="lede">Þú færð aðgang að þjálfunarappi sem heldur utan um æfingar og
        framvindu. Vikan birtist á sunnudegi, þú skráir það sem þú lyftir og hleypur, og
        sérð hvert þú ert að fara yfir lengra tímabil.</p>
      <ul class="app-pts">
        <li><span class="app-k">Sun</span> Öll vikan birt í einu</li>
        <li><span class="app-k">Skráning</span> Þyngdir, tímar og endurtekningar</li>
        <li><span class="app-k">Stig</span> Skiptu um erfiðleikastig hvenær sem er</li>
        <li><span class="app-k">Búnaður</span> Aðlögun ef sleða eða sandpoka vantar</li>
      </ul>
      <a class="btn btn-v" href="${CONTACT.trialUrl}" target="_blank" rel="noopener">
        Skoða fríu vikuprufuna</a>
      <p class="note">Vikuprufan er opin öllum og krefst ekki greiðslu.</p>
    </div>

    <div class="app-vis" aria-hidden="true">
      <div class="phone">
        <div class="phone-scr">
          <p class="ph-top"><span>Vikan</span><span class="ph-lv" data-lvname>OPEN</span></p>
          ${WEEK.filter((d) => d.kind !== 'drop').map((d, i) => `
          <div class="ph-row ph-${d.kind}" style="--i:${i}">
            <span class="ph-d">${esc(d.short)}</span>
            <span class="ph-t">${esc(d.title)}</span>
            <span class="ph-c"></span>
          </div>`).join('')}
          <p class="ph-foot">Birt sunnudag</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- 5. STODVARNAR ------------------------------------------------------- -->
<!-- the course, as a band that reverses direction with the scroll -->
<div class="mq" aria-hidden="true">
  <div class="mq-track" id="mqTrack">
    ${[0, 1].map(() => `<div class="mq-set">${MARQUEE.map((m, i) => `
      <span class="mq-i"><b>${String(i + 1).padStart(2, '0')}</b>${esc(m)}</span>
      <span class="mq-r">1 km</span>`).join('')}</div>`).join('')}
  </div>
</div>

<section class="st" id="stodvarnar">
  <div class="wrap">
    <header class="sec-h">
      <p class="eyebrow">Hvað er Hyrox</p>
      <h2 class="h2" data-split>Átta stöðvar. Átta kílómetrar.</h2>
      <p class="lede lede-hl" data-hl>Hyrox er keppni sem er haldin um allan heim, nánast
        hverja helgi. Þú hleypur einn kílómetra, tekur eina stöð, og endurtekur átta sinnum.
        Hægt er að keppa einn, með félaga í Doubles eða í fjögurra manna boðliði.</p>
    </header>
  </div>

  <!-- race instrumentation: which station you are standing in -->
  <div class="stcount" id="stcount" aria-hidden="true">
    <span class="stcount-l">Stöð</span>
    <span class="stcount-n"><b id="stcountN">01</b>/08</span>
    <span class="stcount-bar"><i id="stcountBar"></i></span>
  </div>

  <ol class="st-list">
    ${STATIONS.map((s, i) => `
    <li class="stn ${s.img ? '' : 'stn-plain'}" style="--i:${i}">
      ${s.img ? `<div class="stn-img js-rv">${img(s.img, s.alt, '')}</div>`
              : '<div class="stn-img stn-void" aria-hidden="true"><span>07</span></div>'}
      <div class="stn-txt">
        <span class="stn-n" aria-hidden="true">${s.n}</span>
        <h3 class="stn-name">${esc(s.name)}</h3>
        <p class="stn-spec">${esc(s.spec)}</p>
        <p class="stn-body">${esc(s.body)}</p>
      </div>
      <span class="stn-run" aria-hidden="true">1 km hlaup</span>
    </li>`).join('')}
  </ol>

  <div class="wrap">
    <p class="note">Þyngdir og endurtekningar fara eftir flokki. Sjá nánar á
      <a href="https://hyrox.com/" target="_blank" rel="noopener">hyrox.com</a>.
      Hyrox.is er þjálfunaraðili og stendur ekki fyrir mótunum sjálfum.</p>
  </div>
</section>

<!-- 6. PUNCH ONE / SAMFELAGID ------------------------------------------- -->
<section class="punch punch-a" id="samfelag">
  <div class="wrap punch-in">
    <p class="eyebrow eyebrow-d">Samfélagið</p>
    <h2 class="punch-h" data-split>Þú ert aldrei ein eða einn á ráslínunni.</h2>
    <p class="punch-lede">Hyrox er keppni þar sem allir fara sömu braut, sama hvar þeir
      byrja. Þú deilir árangri, spyrð spurninga og færð stuðning frá fólki sem er að æfa
      nákvæmlega það sama og þú, í sömu viku og þú.</p>
    <div class="punch-fig">
      ${img('community', 'Keppendur standa saman á ráslínu á Hyrox móti', 'js-par js-kb')}
    </div>
  </div>
</section>

<!-- 7. MOTASKRA --------------------------------------------------------- -->
<section class="races" id="mot">
  <div class="wrap">
    <header class="sec-h">
      <p class="eyebrow">Mótaskrá</p>
      <h2 class="h2" data-split>Næstu mót</h2>
      <p class="lede">Hyrox mót eru haldin nánast hverja helgi. Þetta eru næstu mótin í
        Evrópu, með þau nálægustu merkt. Þú þarft ekki að skrá þig á mót til að æfa, en
        það hjálpar að hafa dagsetningu til að stefna á.</p>
    </header>

    <ul class="race-list">
      ${RACES.items.map((r, i) => `
      <li class="race ${r.near ? 'race-near' : ''}" style="--i:${i}">
        <span class="race-when">${esc(r.date)}</span>
        <span class="race-where"><strong>${esc(r.city)}</strong><span>${esc(r.country)}</span></span>
        ${r.near ? '<span class="race-tag">Stutt að fara</span>' : '<span class="race-tag"></span>'}
      </li>`).join('')}
    </ul>

    <div class="race-foot">
      <a class="btn btn-ghost" href="${CONTACT.raceUrl}" target="_blank" rel="noopener">
        Öll mótaskráin á hyrox.com</a>
      <p class="note">Dagsetningar staðfestar ${esc(RACES.checked)}. Mót geta færst,
        svo staðfestu alltaf á hyrox.com áður en þú bókar ferð.</p>
    </div>
  </div>
</section>

<!-- 8. PUNCH TWO / THJALFARARNIR ---------------------------------------- -->
<section class="punch punch-b" id="thjalfarar">
  <div class="wrap coach-in">
    <div class="coach-copy">
      <p class="eyebrow eyebrow-d">Þjálfararnir</p>
      <h2 class="punch-h" data-split>Tveir þjálfarar sem keppa sjálfir.</h2>
      <p class="punch-lede">Prógrammið er skrifað af fólki sem æfir það sjálft og hefur
        keppt lengi, í CrossFit, lyftingum, frjálsum íþróttum og nú Hyrox. Þau bjóða líka
        upp á einstaklingsmiðaða þjálfun til viðbótar.</p>
      <div class="coach-grid">
        ${COACHES.map((c) => `
        <article class="coach">
          <h3 class="coach-n">${esc(c.name)}</h3>
          <p class="coach-r">${esc(c.role)}</p>
          <p class="coach-b">${esc(c.body)}</p>
          <ul class="coach-h">
            ${c.honours.map((h) => `<li>${esc(h)}</li>`).join('')}
          </ul>
          <p class="coach-c">${c.certs.map((x) => esc(x)).join(' · ')}</p>
          <p class="coach-s"><span class="coach-num">${esc(c.stat)}</span> ${esc(c.statLabel)}</p>
        </article>`).join('')}
      </div>
      <p class="coach-lic">${esc(LICENCE)}</p>
      <a class="btn btn-d" href="mailto:${CONTACT.email}?subject=${encodeURIComponent('Fyrirspurn um einstaklingsmiðaða þjálfun')}">
        Spyrja um einstaklingsþjálfun</a>
    </div>
    <figure class="coach-fig">
      ${img('coaches', 'Ómar Freyr Sævarsson og Alma Hrönn Káradóttir, þjálfarar Hyrox.is', 'js-rv')}
      <figcaption>Alma Hrönn Káradóttir og Ómar Freyr Sævarsson</figcaption>
    </figure>
  </div>
</section>

<!-- 9. KVEDJUR (sample-labelled) ---------------------------------------- -->
<section class="kv" id="kvedjur">
  <div class="wrap">
    <header class="sec-h">
      <p class="eyebrow">Kveðjur</p>
      <h2 class="h2">Frá iðkendum</h2>
    </header>
    ${KVEDJUR.isSample ? `<p class="kv-flag" role="note"><span>Sýnidæmi</span> ${esc(KVEDJUR.label)}</p>` : ''}
    <ul class="kv-list">
      ${KVEDJUR.items.map((k, i) => `
      <li class="kvc" style="--i:${i}">
        <p class="kvc-b">${esc(k.body)}</p>
        <p class="kvc-w"><strong>${esc(k.who)}</strong><span>${esc(k.meta)}</span></p>
      </li>`).join('')}
    </ul>
  </div>
</section>

<!-- 10. FYRIR STODVAR (B2B) --------------------------------------------- -->
<section class="b2b" id="stodvar">
  <div class="b2b-bg">${img('grid', 'Keppnisbraut Hyrox séð ofan frá, með merktum brautum', 'js-par')}</div>
  <div class="wrap b2b-in">
    <header class="sec-h">
      <p class="eyebrow">${esc(PRICING.gyms.label)}</p>
      <h2 class="h2" data-split>Prógramm fyrir stöðina þína</h2>
      <p class="lede">${esc(PRICING.gyms.lede)}</p>
    </header>

    <div class="tiers">
      ${PRICING.gyms.tiers.map((t, i) => `
      <article class="tier" style="--i:${i}">
        <h3 class="tier-n">${esc(t.name)}</h3>
        <p class="tier-s">${esc(t.spec)}</p>
        <p class="tier-p"><span class="tier-num">${esc(t.price)}</span> kr á mánuði</p>
        <p class="tier-b">${esc(t.body)}</p>
      </article>`).join('')}
    </div>

    <a class="btn btn-v" href="mailto:${CONTACT.email}?subject=${encodeURIComponent('Fyrirspurn um prógramm fyrir stöð')}">
      Fá frekari upplýsingar</a>
  </div>
</section>

<!-- 11. VERD OG SKRANING ------------------------------------------------ -->
<section class="buy" id="verd">
  <div class="wrap buy-in">
    <div class="buy-price">
      <p class="eyebrow">${esc(PRICING.solo.label)}</p>
      <p class="buy-num"><span>${esc(PRICING.solo.price)}</span> ${esc(PRICING.solo.unit)}</p>
      <ul class="buy-l">
        ${PRICING.solo.lines.map((l) => `<li>${esc(l)}</li>`).join('')}
      </ul>
      <p class="buy-terms">${esc(PRICING.solo.terms)}</p>
      <a class="buy-trial" href="${CONTACT.trialUrl}" target="_blank" rel="noopener">
        Eða prófaðu fríu vikuprufuna fyrst</a>
    </div>

    <div class="buy-form-w">
      <form class="bform" id="bform" novalidate>
        <h2 class="h2 bform-h">Skrá mig</h2>
        <p class="bform-lede">Fylltu út og þú færð svar frá þjálfurunum. Engin greiðsla
          fer fram hér.</p>

        <div class="f-row">
          <label class="f" for="f-name">Nafn
            <input id="f-name" name="name" type="text" autocomplete="name" required>
          </label>
          <label class="f" for="f-mail">Netfang
            <input id="f-mail" name="email" type="email" autocomplete="email" required>
          </label>
        </div>

        <fieldset class="f-fs">
          <legend>Stig</legend>
          <div class="f-lv">
            ${LV.map((k) => `
            <label class="f-lvo">
              <input type="radio" name="level" value="${k}" data-formlevel="${k}">
              <span>${esc(LEVELS[k].name)}</span>
            </label>`).join('')}
          </div>
        </fieldset>

        <fieldset class="f-fs">
          <legend>Hvað viltu byrja á</legend>
          <div class="f-lv f-lv2">
            <label class="f-lvo"><input type="radio" name="plan" value="vikuprufa" checked><span>Frí vikuprufa</span></label>
            <label class="f-lvo"><input type="radio" name="plan" value="askrift"><span>Áskrift, 7.990 kr</span></label>
          </div>
        </fieldset>

        <label class="f" for="f-msg">Eitthvað sem þjálfararnir ættu að vita
          <textarea id="f-msg" name="msg" rows="3"
            placeholder="Meiðsli, búnaður sem þú hefur aðgang að, mót sem þú stefnir á"></textarea>
        </label>

        <p class="f-err" id="f-err" role="alert" hidden></p>
        <button class="btn btn-v bform-go" type="submit">Senda</button>
        <p class="note">Frumgerð. Hnappurinn opnar tilbúinn tölvupóst á ${esc(CONTACT.email)}
          með öllu útfylltu.</p>
      </form>

      <div class="receipt" id="receipt" hidden tabindex="-1">
        <p class="rc-tag">Tilbúið</p>
        <h2 class="h2">Takk, <span id="rc-name">…</span></h2>
        <dl class="rc-l" id="rc-list"></dl>
        <a class="btn btn-v" id="rc-send" href="#">Opna póstinn</a>
        <button type="button" class="btn btn-ghost" id="rc-back">Breyta</button>
      </div>
    </div>
  </div>
</section>

<!-- 12. FAQ ------------------------------------------------------------- -->
<section class="faq" id="spurningar">
  <div class="wrap">
    <header class="sec-h">
      <p class="eyebrow">Algengar spurningar</p>
      <h2 class="h2">Það sem fólk spyr að</h2>
    </header>
    <div class="faq-l">
      ${FAQ.map((f, i) => `
      <details class="fq" style="--i:${i}">
        <summary><span>${esc(f.q)}</span><i aria-hidden="true"></i></summary>
        <div class="fq-a"><p>${esc(f.a)}</p></div>
      </details>`).join('')}
    </div>
  </div>
</section>

<!-- 13. CLOSER / the quiz returns --------------------------------------- -->
<section class="closer">
  <div class="closer-bg">${img('finish', 'Keppandi hleypur inn á lokakafla Hyrox brautar', 'js-par js-kb')}</div>
  <div class="wrap closer-in">
    <h2 class="closer-h" data-split>Taktu næsta skref í þinni Hyrox vegferð.</h2>
    <p class="closer-lede">Vikuprufan er frí og þú getur sagt upp áskrift hvenær sem er.</p>
    <div class="closer-cta">
      <a class="btn btn-v btn-lg" href="${CONTACT.trialUrl}" target="_blank" rel="noopener">Frí vikuprufa</a>
      <a class="btn btn-ghost btn-lg" href="#verd">Skrá mig í áskrift</a>
    </div>
    <p class="closer-lv" data-haslevel hidden>Stillt á <strong data-lvname>OPEN</strong>.
      <button type="button" class="lnk" data-resetlevel>Breyta</button></p>
  </div>
</section>

</main>

<div class="stickybar" id="stickybar" aria-hidden="true">
  <span class="sticky-t"><b>Frí vikuprufa</b><span>Engin greiðsla, engin binding</span></span>
  <a class="btn btn-v" href="${CONTACT.trialUrl}" target="_blank" rel="noopener">Byrja</a>
</div>

<footer class="ft">
  <div class="wrap ft-in">
    <div class="ft-a">
      <span class="ft-mark">${wordmark('f')}</span>
      <p class="ft-t">Fjarþjálfun sniðin að Hyrox. Þrjú erfiðleikastig, fimm æfingar í viku.</p>
    </div>
    <div class="ft-b">
      <p class="ft-h">Hafa samband</p>
      <a href="mailto:${CONTACT.email}">${esc(CONTACT.email)}</a>
      <a href="${CONTACT.igUrl}" target="_blank" rel="noopener">Instagram @${esc(CONTACT.ig)}</a>
      <a href="${CONTACT.fbUrl}" target="_blank" rel="noopener">${esc(CONTACT.fb)}</a>
    </div>
    <div class="ft-c">
      <p class="ft-h">Um myndirnar</p>
      <p>${esc(PHOTO_CREDIT.event)}.<br>Ljósmyndir: ${esc(PHOTO_CREDIT.by)}.</p>
      <p class="ft-note">Hyrox.is er þjálfunaraðili. Mótin sjálf eru á vegum Hyrox.</p>
    </div>
  </div>
  <p class="ft-end"><span>© ${new Date().getFullYear()} Hyrox.is</span></p>
</footer>

<script type="application/json" id="hxdata">${JSON.stringify({
  levels: Object.fromEntries(LV.map((k) => [k, {
    name: LEVELS[k].name, verdict: LEVELS[k].verdict,
    why: LEVELS[k].why, focus: LEVELS[k].focus,
  }])),
  gear: Object.fromEntries(QUIZ.gear.items.map((g) => [g.id, g.answer])),
  goals: Object.fromEntries(QUIZ.goals.items.map((g) => [g.id, g.label])),
}).replace(/</g, '\\u003c')}</script>
<script src="app.js" defer></script>
</body>
</html>`;
}
