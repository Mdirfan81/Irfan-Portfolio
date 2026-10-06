# Md Irfan Khan — Portfolio

Personal portfolio site. One continuous WebGL star field runs behind the whole
page — scroll is the flight, and each section owns a station along it, where
the stars regroup into a figure of its own. The
content itself stays ordinary accessible DOM on top, with a WCAG 2.1 AA baseline
enforced by tests rather than assumed.

## Stack

| Concern    | Choice                                      |
| ---------- | ------------------------------------------- |
| UI         | React 19, TypeScript                        |
| Build      | Vite 8                                      |
| Motion     | Motion (`motion/react`)                     |
| 3D         | three.js + React Three Fiber (code-split)   |
| Routing    | React Router 8                              |
| Icons      | Lucide React                                |
| Lint       | ESLint 10 (flat config) + typescript-eslint |
| Unit tests | Vitest + Testing Library                    |
| E2E / a11y | Playwright + axe-core                       |

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

## Scripts

| Script                 | What it does                                      |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Dev server with HMR                               |
| `npm run build`        | Typecheck, then production build to `dist/`       |
| `npm run build:single` | Single self-contained HTML file in `dist-single/` |
| `npm run preview`      | Serve the production build                        |
| `npm run lint`         | ESLint over the whole project                     |
| `npm run typecheck`    | `tsc -b --noEmit`                                 |
| `npm test`             | Vitest unit suite                                 |
| `npm run test:e2e`     | Playwright suite (desktop + mobile viewports)     |

`npm run test:e2e` builds and serves the app itself. On a machine that already
has Chromium, set `PW_CHROMIUM_PATH=/path/to/chrome` to skip
`npx playwright install`.

## Structure

```
src/
  styles/tokens.css     Design tokens — colours, type scale, spacing, motion.
  styles/global.css     Reset, layout primitives, shared .btn / .chip / .glass.
  data/                 All site content. Edit here, not in components.
  lib/                  Hooks: theme, active section, count-up, hash scroll, motion variants.
  components/           Nav, StationRail, Backdrop, AuroraBackground, LiquidCursor, TiltCard, Flow, Reveal, Marquee, ScrollProgress.
  three/                The journey: stations, scene, canvas wrapper, performance guard.
  sections/             One file per page section, each with its own CSS module.
  routes/               Home and NotFound.
e2e/                    Playwright specs.
```

### Editing content

Everything the site says lives in `src/data/`:

- `profile.ts` — name, role, contact details, links, nav items
- `metrics.ts` — the impact figures
- `skills.ts` — skill groups (`core: true` highlights a chip)
- `experience.ts` — roles, bullets, stack tags
- `projects.ts` — project cards, domains, `featured: true` for emphasis
- `writing.ts` — published Medium posts

Adding a section means adding it to `navItems` in `profile.ts`, to `STATIONS` in
`src/three/stations.ts`, and to `routes/Home.tsx`. The nav, the station rail and
the 3D scene all read from those two lists, so they cannot drift apart. A new
station gathers into a plain cloud until it is given a figure in
`src/three/formations.ts`.

No copy is hardcoded inside a component.

## Design system

Tokens are the single source of truth; components never hardcode a colour.
`tokens.css` defines the dark palette on `:root` and re-points the same token
names under `:root[data-theme='light']`, so the theme toggle swaps one attribute.
An inline script in `index.html` resolves the theme before first paint, which
avoids both a flash of the wrong palette and a colour transition.

Contrast was chosen against the base surface, not eyeballed: body text sits at
about 16:1, muted text at 8:1, and accents at 7:1 or better in both themes.

## The journey

`src/three/` holds one persistent scene, fixed behind the document:

- **Constellation** — one set of stars that gathers into a different figure
  for each section: `</>`, `6+`, a rising chart, an atom, a commit graph, a
  nested cube, lines of prose, `@`. Only the two figures either side of the
  current scroll position are bound; the vertex shader blends between them, so
  a regrouping costs the CPU nothing. It hangs in the upper right, the one part
  of the screen every section leaves clear.
- **Nebula** — domain-warped noise, drawn into a small off-screen buffer and
  stretched over the view, tinted by the current station and brightest behind
  the constellation.
- **Star field** — distant stars that wrap endlessly; scroll speed stretches
  them into streaks, so a fast scroll reads as a jump between stations.
- **Pilot** — eases raw scroll and pointer input into the flight state every
  other layer reads, and leans the camera toward the pointer.

The scene is decorative and `aria-hidden`; every word on the page is real DOM
above it. That is deliberate — a portfolio has to survive a recruiter with a
screen reader, a slow laptop, or JavaScript disabled halfway through loading.

**Backing off gracefully.** `Backdrop` probes for WebGL and for Save-Data before
loading three.js at all; `PerfGuard` then measures real frame times and drops
resolution at ~29fps, handing the page back to the CSS aurora below ~16fps. With
`prefers-reduced-motion` the scene renders one static frame: the first figure,
already formed. The scene also waits for the page to finish loading before it
mounts, and stays off below 768px, where the CSS aurora is the whole backdrop.

## Motion

Four DOM layers on top of the scene, all opacity/transform only:

1. **Ambient** — drifting aurora blooms and a pointer-tracked spotlight that
   write CSS custom properties directly, so mouse movement never re-renders React.
2. **Scroll flow** — cards, list items and panels arrive and leave in step with
   the scroll instead of playing once. `lib/flow.ts` is the whole engine: one
   scroll listener and one frame loop work out, for every `Flow` element, how
   far it has come in, how far it has gone out and how far the reading line is
   through it, and write those as `--flow-in`, `--flow-out` and
   `--flow-through`. CSS in `global.css` turns the numbers into movement, so a
   component chooses how it flows with a class (`rise`, `left`, `zoom`,
   `step`) or by reading the properties itself — the experience spine, the
   timeline nodes and the metric meters all do. Elements further right lag a
   little, which staggers a grid by where its cards actually are.
3. **Entrance** — headings split into words that rise out of a mask, eyebrows
   that draw their rule, and `Reveal` for the few things that still play once.
4. **Interaction** — `TiltCard` perspective tilt on Motion springs, the shared
   layout pill in the nav and project filters, the count-up on impact figures,
   and a skills marquee whose pace and direction follow the scroll.

**The cursor.** On a mouse, the system cursor is replaced by a bubble of
liquid glass (`LiquidCursor`, engine in `lib/liquidCursor.ts`). It trails the
pointer on a spring and stretches along its direction of travel; moving fast
sheds drops, and an SVG filter fuses any that touch, so they pull away on a
neck and bead off. In Chromium the bubble bends the page behind it through a
displacement map. Over a button or link it pours itself round the control as a
sheet of glass; over a card it grows into a lens and the card's rim lights up
under it. A dot marks the exact pointer position with no lag. Touch devices and
reduced motion keep the system cursor.

The header starts as a full-width bar and draws in to a floating glass capsule
once the page moves; the caption under the name then tracks the section on
screen.

Every one of those checks `useReducedMotion()`, and `global.css` collapses
durations under `prefers-reduced-motion: reduce`. The unit suite runs with
reduced motion reported as on, so component tests are deterministic; Playwright
covers the full-motion path.

## Accessibility

Checked in CI by `e2e/portfolio.spec.ts`:

- axe-core, WCAG 2.1 A + AA, zero violations on desktop and mobile
- skip link is the first tab stop
- every interactive target at least 44px tall
- no horizontal scroll at any tested width
- deep links (`/#projects`) reach their section — client rendering means the
  browser's native fragment scroll fires too early, so `useHashScroll` re-runs it
- the 3D layer stays `aria-hidden`, `pointer-events: none`, and controls over it
  still take clicks

## Bundle

| Chunk                    | Raw    | gzip   |
| ------------------------ | ------ | ------ |
| App                      | 413 KB | 133 KB |
| Journey (three.js, lazy) | 887 KB | 236 KB |
| CSS                      | 32 KB  | 7 KB   |

The 3D chunk is fetched only after the page has loaded and the WebGL, Save-Data
and viewport-width checks pass, so phones never download it.

## Deploying

Static output — `npm run build` then upload `dist/`. On Netlify, Vercel or
Cloudflare Pages the defaults work as-is (build `npm run build`, publish `dist`).
Deploying under a sub-path? Set `base` in `vite.config.ts`.
