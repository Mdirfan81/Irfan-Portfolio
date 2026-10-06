# Notes for agents working on this repo

Things learned while working here that the code and the README do not make
obvious. Read `README.md` first for the stack, the folder map and how the 3D
journey is built; this file is the layer on top of that.

## Working with the owner

- Effects are usually requested by linking an Aceternity UI component. This repo
  has no Tailwind and no shadcn, so do not install the component. Rebuild the
  effect in the repo's own idiom: a CSS module, design tokens, and
  `motion/react` where a spring is needed.
- "Make it smooth" is a standing expectation for anything animated. Check the
  result in a real browser before reporting it done.
- On 2026-10-06 the owner asked for no new unit tests and no new Playwright
  specs alongside the loader and error-boundary work. Ask before adding tests to
  a UI or animation change.
- The owner edits files while a session is running (`index.html`, `src/data/`,
  section copy). Treat a file that changed on disk as intended and never revert
  it.
- Nothing is committed unless asked.

## Checking work

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` are quick.
  Run them after any change.
- Unit tests run in jsdom with reduced motion reported as on and CSS not
  applied. jsdom has no `ResizeObserver` and no WebGL, so guard browser-only
  APIs (`typeof ResizeObserver === 'undefined'`) or a test will throw.
- To look at something, build, run `npx vite preview --port 4173 --host
  127.0.0.1`, and screenshot it with a throwaway Playwright script kept outside
  the repo. Useful tricks:
  - hold back the 3D chunk with `page.route(/JourneyCanvas/, …)` to see what the
    page looks like while it loads, or `route.abort()` to see it fail;
  - set the theme with `localStorage.setItem('mik-theme-choice', 'light')` in an
    init script, because `colorScheme` does not switch it;
  - pause a CSS animation and set `currentTime` through `el.getAnimations()` to
    capture one exact frame.
- On the owner's Windows machine: Python is not installed, so use `node` for
  scripts. Playwright has no managed browsers, so launch with
  `channel: 'chrome'`, and run the suite as
  `PW_CHROMIUM_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe' npx playwright test --workers=2`.
  More workers starve the software-rendered WebGL scene and tests time out.
- The scene only mounts at 768px and wider, after `load` plus an idle callback.
  Headless Chrome needs
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` to render
  it at all, and renders it slowly, so timings measured there are pessimistic.

## Known problems, as of 2026-10-06

- `e2e/portfolio.spec.ts` "has no detectable WCAG 2.1 AA violations" fails on
  both projects. The cause is `TextReveal`: words waiting to be revealed sit at
  `opacity: 0.22`, and axe measures contrast on `aria-hidden` text too. It
  failed before the changes described below and is unrelated to them.
- Between 900px and about 1100px wide the header is cramped: the brand text
  wraps, and close to 900px "Get in touch" runs off the right edge.
  The desktop nav breakpoint (900px in `Nav.module.css`) is too low for seven
  links plus the call to action.

## Conventions the code follows

- Colours, spacing, durations and easings come from `src/styles/tokens.css`.
  Never hardcode a colour; mix tokens with `color-mix(in oklab, …)`.
- Two formatting styles coexist. `src/components`, `src/lib`, `src/routes` and
  `src/App.tsx` use single quotes and no semicolons. `src/three` and
  `src/sections/Hero.tsx` use double quotes and semicolons. Match the file.
- Comments say why, in full sentences, and are common. Keep that density.
- Site copy lives in `src/data/`. `NotFound` and `ErrorScreen` are the
  exceptions and carry their own copy.
- Decoration is `aria-hidden` and `pointer-events: none`, and must never affect
  layout or block content.

## Motion rules

- `global.css` sets `animation-duration: 0.001ms !important` under
  `prefers-reduced-motion: reduce`. An infinite animation becomes a strobe under
  that rule, so either put it inside `@media (prefers-reduced-motion:
  no-preference)` or do not render the element at all when
  `useReducedMotion()` is true.
- Pointer-driven effects check `e.pointerType === 'mouse'`. A tap fires pointer
  events too, but never the leave that would reset the effect.
- Animate `transform`/`opacity`, or the individual `translate`, `rotate` and
  `scale` properties. Anything on screen during page load must be
  compositor-only, because the main thread is busy parsing three.js and
  compiling shaders at exactly that moment.
- For an enter or exit that can be interrupted, use a CSS transition, not
  keyframes: a transition continues from the current value, keyframes restart.
  `@starting-style` gives an entrance without any JavaScript.
- A Motion value can drive a CSS custom property: `style={{ '--x': value } as
  MotionStyle}`. Motion writes the bare number with no unit, so multiply by
  `1px` in the stylesheet. This keeps sizes and tokens in CSS and one number in
  JavaScript.
- React 19.2 `useId()` returns ids like `_r_0_`, which are safe inside
  `url("#…")` without escaping.

## How the recent pieces work

**Header dock (`Nav.tsx`, `Nav.module.css`).** Each link has a spring-driven
`--dock-scale` set from its distance to the pointer, with a raised-cosine
falloff. The label is scaled with a transform and a matching margin opens the
room it overhangs. The dock must not change width: the first version widened
and squeezed the brand until the name wrapped and the bar grew taller. Now each
link reports its extra width, and the total is taken back out of every link's
padding through `--dock-squeeze`. `.links` is a fixed-height slot, and the dock
inside it overflows evenly above and below. Tune with `DOCK_PEAK`, `DOCK_REACH`
and `DOCK_SPRING`.

**Squiggly name (`SquigglyText.tsx`).** Five SVG displacement filters stepped
through by a `step-end` keyframe loop. The filter ids come from `useId()` and
reach the keyframes as custom properties. The wrapper sits outside the hero's
`overflow: hidden` line masks, otherwise the wobble is clipped at each line box.
At phone sizes the default 6 to 8px displacement is heavy; pass a smaller
`scale`.

**Scene loader (`JourneyLoader.tsx`, `Backdrop.tsx`).** The 3D scene is late on
purpose: it waits for `load` plus idle, then downloads about 240KB gzipped, then
compiles shaders. Do not "fix" the delay by loading it earlier; the README
explains why content comes first. The loader fills the gap instead. It is a
zero-sized fixed point at `78%` across and `26.7%` down, which is where
`ANCHORS[0]` in `JourneyScene.tsx` puts the first constellation, so the bubble
hands over to the figure in place. If the anchor changes, change both. The
entrance is held back 350ms so a warm-cache load, where the scene is up almost
at once, does not flash a loader. `JourneyCanvas` reports its first `useFrame`
through `onFirstFrame`; that ends the loader and fades the canvas layer in from
`opacity: 0`, so the scene and its scrim no longer land in one jump.

**Error boundaries (`ErrorBoundary.tsx`, `ErrorScreen.tsx`).** Four of them,
from the outside in:

| Where                          | Protects                 | Fallback                    |
| ------------------------------ | ------------------------ | --------------------------- |
| `main.tsx`, around `App`       | nav, router, app shell   | `ErrorScreen` inside `main` |
| `App.tsx`, around the routes   | page sections            | `ErrorScreen`, nav survives |
| `App.tsx`, around the cursor   | `LiquidCursor`           | nothing; system cursor      |
| `Backdrop.tsx`, around scene   | lazy chunk and the scene | nothing; aurora stays       |

Decoration gets `fallback={null}`. `ErrorScreen` uses a plain reload button and
a `mailto:` link, not router links, because the router may be what broke.

## Traps

- Do not import anything from `src/three/` into the main bundle, not even a
  small helper such as `rng`. It drags the module, and possibly three.js, out of
  the lazy chunk. Phones never download that chunk today.
- A filter or transform on an ancestor of the hero title interacts with the
  `overflow: hidden` masks used for the rise-in. Decide which side of the mask
  an effect belongs on before adding it.
- `.btn` in `global.css` sets `display` at the same specificity as CSS module
  classes. Module rules that need to hide a `.btn` use `!important`; see `.cta`
  in `Nav.module.css`.
