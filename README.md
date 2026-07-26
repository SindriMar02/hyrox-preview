# hyrox.is redesign preview

A spec redesign of **hyrox.is** (Icelandic Hyrox remote coaching, Alma Hrönn
Káradóttir and Ómar Freyr Sævarsson). Standalone, vanilla, zero runtime
dependencies. The Grind system (thegrind.nl) re-structured, not reskinned.

```bash
npm run build     # -> dist/
npm run serve     # http://localhost:8795
npm run qa        # 93 headless checks (needs: npm i --no-save puppeteer-core)
node qa/a11y.mjs  # contrast + a11y sweep
node qa/walk.mjs  # viewport-by-viewport capture -> qa/walk/
./deploy.sh       # gh-pages from an isolated worktree, noindex build
```

---

## ⚠ Read before deploying or sending

**1. Photography licence.** All 17 photographs came from the client's own
WordPress media library, but their EXIF copyright is
**Sportograf Digital Solutions GmbH**, HYROX's official event photographer
(shot at **HYROX Katowice, 22 to 23 February 2025**). Alma evidently bought her
own race gallery. That is fine for a spec preview shown to her, but a
**production site needs the licence confirmed**. The footer credits Sportograf
and the event by name. Do not strip that credit.

**2. Testimonials are placeholders.** hyrox.is publishes no member counts, no
ratings and no testimonials, so none were invented. The `kvedjur` section
renders three empty cards behind an explicit „Sýnidæmi" flag. **Swap in real
attributed quotes and delete the flag together, never separately**
(`KVEDJUR` in `src/content.mjs`).

**3. Race dates expire.** `RACES` in `src/content.mjs` was taken from the HYROX
calendar and cross-checked against a second source on **2026-07-26**. Races
move. Re-verify before any deploy and update `RACES.checked`.

---

## Verification that the business is live (2026-07-26)

The newest asset on their site was 7 months old, so this was checked first:

- **Facebook** „Hybrid Training Iceland" (222 followers) has a Reel with an
  inline `publish_time` of **2026-07-05T11:52 UTC**. A machine timestamp, not
  an inferred year.
- Their **Strivee** plan „Hyrox Iceland - Prufuvika" is live and subscribable.
- ISNIC: registrant `AHK29-IS`, created 18 Mar 2024, **expires 18 Mar 2027**.
- Live MX on 1984.is. IG `@hyroxiceland`, TikTok `@almahkara`.
- Alma's listed contact is `Alma@crossfitreykjavik.is`; she coaches at
  CrossFit Reykjavík.

Operating business, stale website.

---

## Concept

> **„Þú ert á brautinni." The page runs the race with you, and answers in your level.**

### The signature: page-global level state

The hero quiz resolves to **START / OPEN / PRO** and **the whole page rewrites
to it** — the training week, the app mock, the closing line, the signup form.
A chip in the header carries the setting and can change it from anywhere; the
choice persists in `localStorage`.

Without JavaScript every level renders side by side, so the page is complete
either way (`<noscript>` block plus the `.vd-none` comparison).

### The funnel

Four steps, split across two surfaces the way the reference splits its quiz:

| Step | Where | What |
|---|---|---|
| 1 | hero | „Hvar ertu núna?" 4 options → resolves the level |
| 2 | `#nidurstada` | „Hvað viltu fá út úr þessu?" multi-select pills |
| 3 | `#nidurstada` | „Hvar æfir þú?" equipment, auto-advances |
| 4 | `#nidurstada` | The result, and **always the free vikuprufa**, never a payment |

Picking a level straight from the header chip jumps to step 4 instead, because
that is a declaration rather than a question.

---

## Art direction

Palette sampled from the client's own race photographs. **The peach is gone.**

| Token | Hex | Where it came from |
|---|---|---|
| `--hx-ground` | `#080D0C` | the arena floor |
| `--hx-panel` | `#101615` | raised surfaces |
| `--hx-ink` | `#E9E9E4` | bone |
| `--hx-dim` | `#98A29E` | body copy, 7.45:1 |
| `--hx-dim2` | `#828E8A` | small labels. Lifted from `#6E7A76`, which measured 4.10:1 and failed AA |
| `--hx-volt` | `#D4F53C` | **the station arches**, hue 55 measured off the BURPEES 04 arch and restored to screen brightness |

No red. Keeping the reference's `#fa3139` would have made this a reskin, and
volt is native to the world their own photographs live in.

**Two punches only**, both full-bleed volt on near-black ink (15.6:1):
community/keppni and the two coaches. Nowhere else.

**Type**: Archivo 900 display + 400/500/600 body. **Array Bold for numerals
only** — a dot-matrix face for station numbers, times and prices, because HYROX
finish boards are LED panels. Numerals-only also avoids its malformed Ú.
Both verified for full Icelandic (Þ Ð Æ Ö Á É Í Ó Ú Ý) with fontTools.

---

## Motion

One damped rAF loop, no GSAP and no Lenis. Every channel eases toward its
target with its own time constant; the depth ordering is what reads as
expensive. All rect reads are batched before all style writes.

| System | Notes |
|---|---|
| Frame-opening intro | Hero photo inset expands to full bleed, 1.5s. The reference locks scroll for ~5s with `cursor:wait`; this never blocks input and is skipped under reduced motion or on a deep link |
| Split-line headings | Lines measured, not guessed. The mask box carries `padding-top: .18em` so Icelandic acutes are not clipped, and a collapsing space text node keeps `textContent` correctly spaced |
| Highlight read | Words brighten as the sentence crosses the reading line |
| Reversing marquee | The eight stations; direction flips with scroll direction, and it only runs while on screen |
| Race counter | Sticky „STÖÐ 04/08" with a filling bar through the stations |
| Media reveal | Off-axis feathered mask + blur + desaturation on one scrubbed value, plus a directional swing whose transform-origin sits at the entering edge |
| Velocity response | Plates hang a few px behind a hard flick, then settle |
| Header retreat, sticky trial CTA, Ken Burns | |

Everything is **scrubbed and reversible**, which QA asserts explicitly
(`0 → 1 → 0`), so a full-page screenshot at `scrollY 0` correctly shows
below-fold blocks as hidden. Use `qa/walk.mjs` for visual review, never
`fullPage`.

---

## What this fixes on the live site

1. **Every conversion CTA is a `mailto:almahkara@gmail.com`** — „Skrá mig",
   „Skrá mig í fjarþjálfun", „Fyrir einstaklinga", „Fyrir líkamsræktarstöðvar",
   „FÁ FREKARI UPPLÝSINGAR". Re-verified 2026-07-26: **6 mailto links and
   0 `<form>` elements** on the homepage.
1b. **Alma's honours are not on the front page.** Evrópumeistari í ólympískum
   lyftingum +35 (2020), brons á HM 35+ (2022), Íslandsmeistari í réttstöðulyftu
   (2020) and í CrossFit 35+ (2022, 2024) appear only on her sub-page. The
   redesign moves them into the coaches punch.
2. The `HYROX ICELAND` heading links to **`http://b`**, a broken link.
3. Stretched raster HYROX logo with JPEG artifacts, beside a second thumbnail logo.
4. Body copy dumped inside the hero; a peach block of three centred paragraphs.
5. Kubio demo leftovers sit in the media library (stock turtles, dunes, spiral
   stairs, logoipsum logos, `human1-4.jpg` avatars). **Corrected 2026-07-26:
   none of these are rendered on any live page** — they are unused uploads, not
   displayed content. What IS still published is the stock „Hello world!" post
   (2025-04-02) and „Sample Page.", both reachable at 200.
6. They have ~96 professional race photographs in their media library and the
   site uses **one** of them (plus two cropped into their own graphics).
7. B2B licensing buried in a paragraph. No events, no proof, no testimonials,
   three pages total.

---

## Files

```
src/content.mjs    all copy and data, with the honesty rules at the top
src/template.mjs   the HTML
src/build.mjs      -> dist/, adds noindex + Disallow when PREVIEW_ORIGIN is set
public/styles.css  every keyframe and custom property is hx- prefixed
public/app.js      level state + funnel + one damped rAF loop
qa/qa.mjs          93 checks
qa/a11y.mjs        contrast + a11y
qa/walk.mjs        scroll-through capture
```

Verified copy lives only in `src/content.mjs`. Prices, session counts, level
names and payment wording are quoted from hyrox.is as read on 2026-07-26.
Do not round or paraphrase them.
