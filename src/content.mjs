/* hyrox.is — all copy and data in one place.
 *
 * HONESTY RULES for anything added here:
 *  - Prices, session counts, level names and payment wording are quoted from
 *    hyrox.is as read on 2026-07-26. Do not round or paraphrase them.
 *  - Race dates were taken from the HYROX calendar and cross-checked against a
 *    second source on 2026-07-26. Anything added later must be re-checked.
 *  - No member counts, ratings or testimonials exist publicly. The kvedjur
 *    block is explicitly labelled as sample content. Never remove that label
 *    while the quotes are placeholders.
 *  - No em-dashes anywhere in customer-facing Icelandic.
 */

export const META = {
  title: 'Hyrox.is · Fjarþjálfun sniðin að Hyrox',
  description:
    'Fjarþjálfun sniðin að Hyrox. Fimm æfingar í viku í þremur erfiðleikastigum, '
    + 'þjálfunarapp sem heldur utan um framvinduna og frí vikuprufa. 7.990 kr á mánuði.',
  lang: 'is',
};

/* The three real levels from hyrox.is. Order matters: this is the ladder. */
export const LEVELS = {
  start: {
    key: 'start',
    name: 'START',
    tag: 'Fyrir þau sem eru að byrja',
    verdict: 'Þú byrjar á START.',
    why: 'Sama vika og allir aðrir fá, með aðlagaðri útfærslu á hverri hreyfingu. '
       + 'Ólympísku lyftingarnar og fimleikaæfingarnar eru með aðlögunarmöguleikum '
       + 'svo þú getur byrjað strax, án þess að kunna þær allar fyrir.',
    focus: ['Tækni á undan þyngd', 'Aðlögun á öllum hreyfingum', 'Hlaupin róleg og jöfn'],
  },
  open: {
    key: 'open',
    name: 'OPEN',
    tag: 'Grunnstigið',
    verdict: 'Þú byrjar á OPEN.',
    why: 'Vikan eins og hún er sett upp, óstytt. Þú kannt hreyfingarnar og '
       + 'þarft prógramm sem heldur utan um álagið í staðinn fyrir að þú finnir '
       + 'það upp sjálf eða sjálfur í hvert skipti.',
    focus: ['Full uppbygging vikunnar', 'Lotur og löng vinnsla', 'Hlaupin á tíma'],
  },
  pro: {
    key: 'pro',
    name: 'PRO',
    tag: 'Fyrir keppendur',
    verdict: 'Þú byrjar á PRO.',
    why: 'Þyngsta útfærslan af sömu viku. Fyrir þau sem eru þegar að keppa og '
       + 'vilja skipulag sem heldur utan um álag og uppbyggingu yfir lengra tímabil.',
    focus: ['Þyngsta útfærslan', 'Uppbygging yfir lotur', 'Vinnsla á keppnishraða'],
  },
};

/* THE FUNNEL. Step 1 lives in the hero, steps 2 to 4 in the section below it,
   the way the reference splits its quiz across two surfaces. Every step ends
   on the free vikuprufa, never on a payment. */
export const QUIZ = {
  question: 'Hvar ertu núna?',
  /* Two sentences, rendered as two spans. The second is repeated by the quiz
     badge and by quiz-foot, so a short viewport can drop it without losing
     any information. */
  lede: 'Þrjár spurningar og þú sérð nákvæmlega hvað þú færð.',
  ledeB: 'Engin greiðsla og fyrsta vikan er frí.',
  badge: 'Frí vikuprufa',
  cta: 'Sjá mína leið',
  reset: 'Byrja upp á nýtt',
  steps: 4,
  options: [
    { id: 'a', label: 'Ég er rétt að byrja að æfa af alvöru', level: 'start' },
    { id: 'b', label: 'Ég æfi reglulega en þekki ekki Hyrox', level: 'start' },
    { id: 'c', label: 'Ég hef klárað Hyrox og vil bæta tímann', level: 'open' },
    { id: 'd', label: 'Ég keppi og vil hámarka árangurinn', level: 'pro' },
  ],

  /* step 2: multi-select. Shapes the closing copy, never a fabricated promise. */
  goals: {
    q: 'Hvað viltu fá út úr þessu?',
    hint: 'Veldu eins margt og þú vilt.',
    items: [
      { id: 'first', label: 'Klára mitt fyrsta Hyrox' },
      { id: 'time', label: 'Bæta tímann minn' },
      { id: 'strong', label: 'Verða sterkari' },
      { id: 'engine', label: 'Byggja upp þol' },
      { id: 'plan', label: 'Komast í fast skipulag' },
      { id: 'abroad', label: 'Keppa á móti erlendis' },
    ],
  },

  /* step 3: single select. Drives the honest equipment answer, which is the
     single most common objection and is already answered on hyrox.is. */
  gear: {
    q: 'Hvar æfir þú?',
    hint: 'Þetta ræður því hvaða aðlaganir eru í boði.',
    items: [
      { id: 'box', label: 'CrossFit eða functional stöð',
        note: 'Fullur búnaður, sleði og sandpoki á staðnum.',
        answer: 'Þú kemst beint í prógrammið eins og það er skrifað, sleði og sandpoki og allt.' },
      { id: 'gym', label: 'Almenn líkamsræktarstöð',
        note: 'Lyftingasvæði og hlaupabretti.',
        answer: 'Æfingarnar henta almennri stöð. Þar sem búnað vantar eru aðlögunarmöguleikar '
              + 'inni í prógramminu, til dæmis fyrir sleða og sandpoka.' },
      { id: 'limited', label: 'Takmarkaður búnaður',
        note: 'Lítil stöð, heimaaðstaða eða á ferðalagi.',
        answer: 'Þú þarft ekki fullbúna stöð. Prógrammið kemur með aðlögunum þegar búnað '
              + 'vantar, og þjálfararnir svara ef þig vantar aðra útfærslu.' },
    ],
  },

  /* step 4 */
  done: {
    eyebrow: 'Þín leið',
    trial: 'Fyrsta vikan er frí',
    trialBody: 'Vikuprufan er alvöru vika úr prógramminu, ekki kynningarefni. '
             + 'Mánudagur, miðvikudagur og föstudagur eru lyftingar og Hyrox vinnsla, '
             + 'laugardagur er hlaup. Engin greiðsla og ekkert kort.',
    trialCta: 'Byrja fríu vikuna',
    subCta: 'Eða skrá mig strax í áskrift',
    backCta: 'Breyta svörum',
  },
};

/* The eight stations as a reversing marquee band. Same eight as the section
   below it, kept in one place so they cannot drift apart. */
export const MARQUEE = [
  'SkiErg', 'Sled Push', 'Sled Pull', 'Burpee Broad Jump',
  'Rowing', 'Farmers Carry', 'Sandbag Lunges', 'Wall Balls',
];

/* The week. Structure is the real vikuprufa published on Strivee
   (Man / Mid / Fos lifting days + Laugardagur running), plus the second
   running session that makes up the five sessions hyrox.is advertises.
   Labelled on the page as a dæmi, because the exact day the second run
   lands is not published. */
export const WEEK = [
  { day: 'Sunnudagur', short: 'Sun', kind: 'drop', title: 'Vikan birt',
    body: 'Öll vikan kemur inn í appið á sunnudegi svo þú getur skipulagt þig fyrirfram.' },
  { day: 'Mánudagur', short: 'Mán', kind: 'lift', title: 'Lengri lyftingar og tækjavinnsla',
    body: 'Liðkun og upphitun, svo lyftingar og vinna á tækjunum sem koma fyrir í keppni.' },
  { day: 'Þriðjudagur', short: 'Þri', kind: 'run', title: 'Hlaupaæfing',
    body: 'Sett upp með upphitun. Önnur af tveimur hlaupaæfingum vikunnar.' },
  { day: 'Miðvikudagur', short: 'Mið', kind: 'lift', title: 'Lyftingar, interval og kjarni',
    body: 'Stuttar og harðar lotur, og kjarnavinna í lokin.' },
  { day: 'Fimmtudagur', short: 'Fim', kind: 'rest', title: 'Hvíld',
    body: 'Enginn skyldutími. Liðkun ef þig vantar hana.' },
  { day: 'Föstudagur', short: 'Fös', kind: 'lift', title: 'Lyftingar og löng vinnsla',
    body: 'Löng vinnsla á Hyrox hraða, og aukavinna í lokin.' },
  { day: 'Laugardagur', short: 'Lau', kind: 'run', title: 'Hlaupaæfing',
    body: 'Lengri hlaupaæfingin. Sett upp með upphitun.' },
];

/* The eight official HYROX stations, with 1 km of running before each.
   Standard distances, stable across events. Loads differ by division, so
   none are stated here. */
export const STATIONS = [
  { n: '01', name: 'SkiErg', spec: '1000 m', img: 'st-01',
    alt: 'Keppandi á SkiErg vél á Hyrox móti',
    body: 'Fyrsta stöðin eftir kílómetrann. Allur líkaminn fer í gang í einu.' },
  { n: '02', name: 'Sled Push', spec: '50 m', img: 'st-02',
    alt: 'Keppandi ýtir hlaðnum sleða eftir braut',
    body: 'Sleðinn er þyngsti punkturinn snemma í keppninni. Fótleggir og öndun.' },
  { n: '03', name: 'Sled Pull', spec: '50 m', img: 'st-03',
    alt: 'Keppendur draga sleða á kaðli',
    body: 'Kaðall og sleði. Bak, grip og þolinmæði.' },
  { n: '04', name: 'Burpee Broad Jump', spec: '80 m', img: 'arch-burpees',
    alt: 'Hyrox bogi yfir fjórðu stöð, merktur BURPEES 04',
    body: 'Stöðin sem flestir tapa tíma á. Taktur skiptir meira máli en hraði.' },
  { n: '05', name: 'Rowing', spec: '1000 m', img: 'st-05',
    alt: 'Keppendur róa á Concept2 vélum',
    body: 'Miðja keppninnar. Hér vinnst tími ef þú hefur æft róðurinn sérstaklega.' },
  { n: '06', name: 'Farmers Carry', spec: '200 m', img: 'st-06',
    alt: 'Keppendur bera ketilbjöllur eftir braut',
    body: 'Gripið gefur sig á undan fótunum ef það hefur ekki verið þjálfað.' },
  /* The photographer's gallery never covered the lunges themselves, so this is
     the course's own numbered floor markers rather than a shot of another
     station passed off as this one. */
  { n: '07', name: 'Sandbag Lunges', spec: '100 m', img: 'st-07',
    alt: 'Brautarmerkingar á gólfi keppnisbrautar, stöðvar 05 til 08',
    body: 'Sandpoki á herðum, útfall alla leið. Áttundi kílómetrinn er eftir.' },
  { n: '08', name: 'Wall Balls', spec: '75 / 100 endurtekningar', img: 'st-08',
    alt: 'Keppendur kasta bolta upp í mark á lokastöðinni',
    body: 'Lokastöðin. Fjöldi endurtekninga fer eftir flokki.' },
];

/* Verified on hyrox.is 2026-07-26. Quote exactly. */
export const PRICING = {
  solo: {
    label: 'Fyrir einstaklinga',
    price: '7.990',
    unit: 'kr á mánuði',
    lines: [
      'Hyrox miðað prógramm',
      '5 æfingadagar í viku',
      '3 lyftingar, Hyrox og aukavinna',
      '2 hlaupaæfingar',
      'Þrjú erfiðleikastig: Pro, Open og Start',
      'Aðgangur að þjálfunarappi',
    ],
    terms: 'Þú færð sendan greiðsluseðil í netbanka. Hægt er að segja upp áskrift '
         + 'hvenær sem er og þú greiðir þá út þann mánuð.',
  },
  gyms: {
    label: 'Fyrir líkamsræktarstöðvar',
    lede: 'Hybrid Training Iceland gefur út prógrömm fyrir stöðvar. Öll með þremur '
        + 'erfiðleikastigum, svo stöð með breitt getubil getur keyrt eina æfingu fyrir alla.',
    tiers: [
      { name: 'Hyrox prógramm', spec: '2 æfingar í viku og hlaupaæfing', price: '12.990',
        body: 'Engar ólympískar lyftingar og fimleikaæfingar í algeru lágmarki.' },
      { name: 'Hyrox prógramm', spec: '3 æfingar í viku og hlaupaæfing', price: '15.990',
        body: 'Sama uppbygging, meiri vikuskammtur. Frábær viðbót inn í functional stöð.' },
      { name: 'CrossFit prógramm', spec: '7 æfingar í viku', price: '16.990',
        body: 'Lotuskipt prógramm með lyftingum og metcons, alla daga vikunnar. '
            + 'Lotumiðað ólympískt lyftingaprógramm í átta vikna lotum.' },
    ],
  },
};

/* Every honour and qualification below is listed by the coaches themselves on
   hyrox.is/thjalfarar-hyrox-is-alma/ and /thjalfarar-hyrox-is-omar/, read
   2026-07-26. Quote them, never round them up, and never add one. */
export const COACHES = [
  {
    name: 'Alma Hrönn Káradóttir',
    role: 'Þjálfari og eigandi',
    body: 'Alma kemur úr heimi CrossFit og hefur keppt á fjöldamörgum mótum í CrossFit, '
        + 'ólympískum lyftingum, kraftlyftingum og þrekmótum, bæði hér heima og erlendis. '
        + 'Hún er starfandi stöðvarstjóri í CrossFit Sport og þjálfari og hönnuður '
        + 'Hyrox Sport námskeiðsins í Sporthúsinu Kópavogi.',
    honours: [
      'Evrópumeistari í ólympískum lyftingum +35, 2020',
      'Brons á heimsmeistaramóti í ólympískum lyftingum 35+, 2022',
      'Íslandsmeistari í réttstöðulyftu, 2020',
      'Íslandsmeistari í CrossFit 35+, 2022 og 2024',
    ],
    certs: ['Hyrox Performance Coach', 'Hyrox Foundation Course', 'CrossFit LV-2 frá 2018',
      'Kennsluréttindi í ólympískum lyftingum', 'Technogym Master Trainer'],
    stat: '2013', statLabel: 'þjálfað síðan',
  },
  {
    name: 'Ómar Freyr Sævarsson',
    role: 'Þjálfari',
    body: 'Ómar byrjaði sjö ára í frjálsum íþróttum og var orðinn aðalþjálfari sautján ára. '
        + 'Hann starfaði sem þjálfari hjá aðildarfélögum innan UMSE og sem sambandsþjálfari '
        + 'í átta ár. Hann á enn fjölda meta í frjálsum íþróttum sem standa óhögguð.',
    honours: [
      'Áttunda sæti í 100 m hlaupi á heimsmeistaramóti unglinga á Eyrasundsleikunum',
      'Valinn í úrvalshóp Frjálsíþróttasambands Íslands þrettán ára',
    ],
    certs: ['Hyrox Foundation Course', 'A og B hluti þjálfaranáms hjá ÍSÍ',
      'Einkaþjálfun, Keilir 2014', 'Íþróttaháskólinn í Sønderborg'],
    stat: '8', statLabel: 'ár sem sambandsþjálfari',
  },
];

/* Quoted verbatim from hyrox.is/um-hyrox-iceland/. This is what justifies any
   HYROX mark appearing on the page at all, so it stays with them. */
export const LICENCE = 'Hyrox Iceland hefur öll tilskilin leyfi til að halda úti '
  + 'Hyrox þjálfun frá Hyrox Official.';

/* Dates from the HYROX race calendar, cross-checked against a second source
   on 2026-07-26. Re-verify before any future deploy: races move. */
export const RACES = {
  checked: '26. júlí 2026',
  items: [
    { city: 'Maastricht', country: 'Holland', date: '17. til 20. september 2026', iso: '2026-09-17' },
    { city: 'Ósló', country: 'Noregur', date: '25. til 27. september 2026', iso: '2026-09-25', near: true },
    { city: 'Gdansk', country: 'Pólland', date: '10. til 11. október 2026', iso: '2026-10-10' },
    { city: 'Birmingham', country: 'Bretland', date: '27. október til 1. nóvember 2026', iso: '2026-10-27' },
    { city: 'London ExCeL', country: 'Bretland', date: '2. til 6. desember 2026', iso: '2026-12-02' },
    { city: 'Stokkhólmur', country: 'Svíþjóð', date: '10. til 13. desember 2026', iso: '2026-12-10', near: true },
    { city: 'Helsinki', country: 'Finnland', date: '18. til 20. desember 2026', iso: '2026-12-18', near: true },
    { city: 'Katowice', country: 'Pólland', date: '19. til 21. febrúar 2027', iso: '2027-02-19' },
    { city: 'Kaupmannahöfn', country: 'Danmörk', date: '25. til 28. mars 2027', iso: '2027-03-25', near: true },
  ],
};

export const FAQ = [
  { q: 'Þarf ég að hafa keppt í Hyrox?',
    a: 'Nei. Start stigið er sett upp fyrir þau sem eru að byrja, og allar hreyfingar '
     + 'eru með aðlögunarmöguleikum. Þú getur skipt um stig hvenær sem er.' },
  { q: 'Hvað þarf ég að hafa aðgang að?',
    a: 'Æfingarnar henta bæði fullbúinni CrossFit eða functional stöð og almennri '
     + 'æfingastöð. Ef þig vantar búnað eins og sleða eða sandpoka eru aðlögunarmöguleikar '
     + 'inni í prógramminu.' },
  { q: 'Hvernig fæ ég æfingarnar?',
    a: 'Í gegnum þjálfunarapp sem heldur utan um æfingar og framvindu. Öll vikan birtist '
     + 'á sunnudegi svo þú getur undirbúið þig.' },
  { q: 'Hvernig er greitt og get ég hætt?',
    a: 'Þú færð sendan greiðsluseðil í netbanka. Hægt er að segja upp áskrift hvenær sem '
     + 'er og þú greiðir þá út þann mánuð.' },
  { q: 'Eru ólympískar lyftingar í prógramminu?',
    a: 'Já, ólympískar lyftingar og fimleikaæfingar eru hluti af einstaklingsprógramminu, '
     + 'en alltaf með aðlögunarmöguleikum. Í prógrömmunum fyrir stöðvar eru þær ekki með.' },
  { q: 'Bjóðið þið upp á einstaklingsmiðaða þjálfun?',
    a: 'Já. Þjálfararnir taka að sér einstaklingsmiðaða þjálfun til viðbótar við '
     + 'fjarþjálfunina. Hafðu samband ef þú hefur áhuga.' },
];

/* PLACEHOLDER. hyrox.is publishes no testimonials and no member counts, so
   nothing here is a real quote. The page labels this block as sample content.
   Swap in real, attributed quotes and delete the label together, never
   separately. */
export const KVEDJUR = {
  isSample: true,
  label: 'Sýnidæmi. Hyrox.is birtir engar umsagnir í dag, svo hér eru engar '
       + 'raunverulegar tilvitnanir. Þetta hólf bíður eftir alvöru kveðjum frá iðkendum.',
  items: [
    { body: 'Plássið fyrir fyrstu umsögnina frá iðkanda.', who: 'Nafn', meta: 'Stig og tímabil' },
    { body: 'Plássið fyrir aðra umsögn, helst með tölu í.', who: 'Nafn', meta: 'Stig og tímabil' },
    { body: 'Plássið fyrir umsögn frá stöð sem keyrir prógrammið.', who: 'Nafn stöðvar', meta: 'Prógramm' },
  ],
};

export const CONTACT = {
  email: 'almahkara@gmail.com',
  ig: 'hyroxiceland',
  igUrl: 'https://www.instagram.com/hyroxiceland/',
  fb: 'Hybrid Training Iceland',
  fbUrl: 'https://www.facebook.com/share/15p5Mc1e9s/',
  trialUrl: 'https://strivee.app/marketplace/plan/BZbfYVmgKVVdlwKkGTuD',
  raceUrl: 'https://hyrox.com/find-my-race/',
};

export const NAV = [
  { href: '#vikan', label: 'Vikan' },
  { href: '#stodvarnar', label: 'Stöðvarnar' },
  { href: '#mot', label: 'Mótaskrá' },
  { href: '#thjalfarar', label: 'Þjálfarar' },
  { href: '#verd', label: 'Verð' },
];

/* Photography credit. These are the client's own uploads but the EXIF
   copyright is Sportograf, HYROX's event photographer. Surfaced in the footer
   rather than buried: a production site needs the licence confirmed. */
export const PHOTO_CREDIT = {
  event: 'Hyrox Katowice, 22. til 23. febrúar 2025',
  by: 'Sportograf',
};
