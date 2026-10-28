# Notes for agents working on this repo

Things learned while working here that the code and the README do not make
obvious. Read `README.md` first for the stack, the folder map and how the 3D
journey is built; this file is the layer on top of that.

## Working with the owner

- Effects are usually requested by linking an Aceternity UI component. This repo
  has no Tailwind and no shadcn, so do not install the component. Rebuild the
  effect in the repo's own idiom: a CSS module, design tokens, and
  `motion/react` where a spring is needed.
- When the owner describes how something should look or behave, build that. If
  you think a different design is better, say so and ask; do not substitute it.
  The first loader was built as a small non-blocking widget in a corner when
  the owner had asked for a full-screen one in the scene's own style, and it had
  to be redone.
- New visuals should look like the 3D scene: soft star dots in the accent,
  violet and cyan tokens, white-hot at the centre on the dark theme.
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
- The scene mounts at every width, phones included. Headless Chrome needs
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` to render
  it at all, and renders it slowly, so timings measured there mean nothing.
- To check a layout, shoot every section at 360, 390, 768, 1024, 1180, 1366 and
  1536 wide, with `isMobile` and `hasTouch` set below 900. Scroll to each
  section before shooting: content arrives with the scroll, so a full-page
  screenshot shows it half-arrived. Also list every element whose box runs past
  the viewport; `scrollWidth` alone misses ones that are clipped.
- To measure smoothness, launch with
  `--enable-gpu --use-angle=d3d11 --ignore-gpu-blocklist` so the real GPU is
  used, and record `requestAnimationFrame` gaps. Do it inside the worker too
  (`page.on('worker', w => w.evaluate(…))`). Each Playwright launch is a fresh
  profile with an empty shader cache, so the first page load of a run is the
  cold case and the second is what a returning visitor gets.
- The loader lifts by itself after 6 seconds. A script that holds the 3D chunk
  longer than that will find the loader already gone.

## Known problems, as of 2026-10-22

- The scene is heavy on the owner's machine. Measured on 2026-10-22 with the
  real GPU, a warm load, wheel-scrolling the whole page: frames at about 33ms
  median and 83ms at the 95th percentile. The commit before the redesign
  (9b3d30f) measured worse the same day (50ms and 283ms), and switching the
  dot-wave or Lenis off did not help, so the cost is the scene as it was. Not
  investigated further. Without the scene the page holds 16.7ms throughout.
- `e2e/portfolio.spec.ts` "has no detectable WCAG 2.1 AA violations" passes,
  but under software rendering it takes 14 to 25s of its 30s budget on the
  `chromium` project, so in a full run it occasionally times out. Every
  failure seen on 2026-10-22 was a timeout, not a violation; rerun alone, it
  passes.
- `e2e/portfolio.spec.ts` "anchor navigation reaches each section" is flaky on
  the `mobile` project since the scene was enabled on phones (2026-10-07):
  about one run in three a section is not reached inside the 5s timeout. Under
  software rendering the phone-sized page is slow enough that the smooth scroll
  stalls. With the real GPU, 10 runs out of 10 reached every section. The cause
  is not pinned down beyond that.

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
  layout. The page loader is the one thing allowed to cover content, at the
  owner's request.

## Motion rules

- `global.css` sets `animation-duration: 0.001ms !important` under
  `prefers-reduced-motion: reduce`. An infinite animation becomes a strobe under
  that rule, so either put it inside `@media (prefers-reduced-motion:
  no-preference)` or do not render the element at all when
  `useReducedMotion()` is true.
- Pointer-driven effects check `e.pointerType === 'mouse'`. A tap fires pointer
  events too, but never the leave that would reset the effect.
- Animate `transform`/`opacity`, or the individual `translate`, `rotate` and
  `scale` properties.
- During start-up the main thread stalls for up to a second at a time (starting
  React, evaluating three.js). Anything animated from it freezes with it.
  Whatever is on screen then must either be compositor-only CSS or be drawn
  from a worker with its own `OffscreenCanvas`.
- A worker does not escape the GPU. Compiling a shader synchronously holds the
  GPU process, and every canvas on the page stops, the worker's included. The
  scene therefore compiles ahead of its first frame with
  `renderer.compileAsync`, with the frame loop held at `never` until it is done.
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

**Page loader.** A full-screen, opaque cover that hides the page until the 3D
scene has drawn, so page and backdrop arrive together. It shows the scene's own
stars gathering into a turning bubble of dots, with a few still streaming in to
the centre; on release the bubble bursts outward and the cover fades.

- `lib/pageLoad.ts` is the state: a module-level store read with
  `usePageLoading()`. Loading starts only where there is a scene to wait for
  (WebGL, no Save-Data, motion not reduced). It ends when
  `Backdrop` calls `releasePage()`, on the scene's first frames or when the
  scene gives up, but never before `MIN_MS` (1.5s) and never after `MAX_MS`
  (6s).
- `components/JourneyLoader.tsx` is the cover. `lib/journeyLoader.ts` creates
  the canvas and hands it to a worker (`loaderField.worker.ts`);
  `lib/loaderField.ts` is the drawing, and has no DOM access so it runs in
  either place. The worker is imported with `?worker&inline` because the
  single-file build cannot fetch a separate script.
- The canvas is created in the effect, not rendered by React. A canvas can be
  transferred to a worker only once, and StrictMode runs effects twice in
  development.
- `Hero` and `Nav` read `usePageLoading()` and hold their entrance animations
  until the cover lifts. Anything else with a first-screen entrance should do
  the same, or it will play unseen.
- While the cover is up `Backdrop` mounts the scene at once. Without a cover
  (reduced motion) it still waits for `load` plus idle, so content comes first.
- `JourneyCanvas` reports ready on its fourth frame, not its first, so the slow
  first draws happen under the cover, then fades its layer in from `opacity: 0`.
- The content stays in the document under the cover, so screen readers are not
  kept waiting. Do not switch it to `visibility: hidden`.
- Measured with the real GPU on the owner's machine: on a warm load the worker's
  worst frame is about 50 to 80ms. On a browser's very first visit there is one
  hitch of 0.3 to 0.4s as the cover lifts, when Chrome compiles its own shaders
  for the page's blurs and filters. That one is not fixed.

**Redesign of 2026-10-22.** The owner asked first for a copy of
yasirshams.com, then, on seeing it, for something of their own built on the old
deep-space look, with the 3D scene and "waves". What came of that:

- *Dot-wave* (`Waves` in `JourneyScene.tsx`, `WAVE_*` in `shaders.ts`). A
  grid of points under the flight, wrapped row by row as it rolls toward the
  viewer, swelling with scroll speed and rippling out from under the pointer.
  Strongest at the hero and contact stations, calmer between.
- *Smooth scrolling* (`lib/smoothScroll.ts`). Lenis moves the real window
  scroll, so `useScroll`, sticky positioning and the journey input all keep
  working. It is stopped while the loader is up. `html:not(.lenis)` keeps the
  native smooth scroll as the fallback; never have both on.
- *Statement* (`sections/Statement.tsx`, no nav item or station). A pinned
  sentence that lights up word by word through `ScrollFill`.
- *Word fill* (`.fill-word` in `global.css`). Words are painted with
  `background-clip: text` over transparent text, so axe sees an unmeasurable
  background rather than low-contrast text. This is what fixed the old WCAG
  failure; `ScrollHighlight` in About uses it too. Do not go back to dimming
  words with `opacity`.
- *Hero prompt.* The ending of "I build interfaces that make teams say" is typed
  out from `profile.hero.endings`; screen readers get the sentence once.
- *Impact* pins its heading and a large count-up of the row crossing the middle
  of the screen; hover overrides it.
- *Projects* pin and carry the row sideways, one pixel across per pixel down
  (`HOLD` sets the pause before it moves). Below 760px wide, under 560px tall,
  on a touch screen (no `hover: hover` and `pointer: fine`) or with reduced
  motion it is a native swipe row instead. Touch was added on 2026-10-28:
  pinned, a tablet ignored a sideways swipe on the cards. The swipe row
  carries `data-lenis-prevent-horizontal` so a trackpad can scroll it, takes
  focus for the arrow keys, and is dragged by a mouse (`lib/useDragScroll.ts`).
  The owner checks the phone layout in a desktop browser with a mouse, so the
  row must work there, not only under a finger.
- *Letter roll* (`RollText`, `.roll-host`) on a few buttons.

The owner rejected anything that reads as the reference: cream sections, gold,
handwriting, all-caps headings, the counter preloader, the fluid-ink cursor.

**Responsive layout.** The breakpoints, and what each one is for:

| Width      | What changes                                                      |
| ---------- | ----------------------------------------------------------------- |
| under 1120 | Nav links and "Get in touch" fold into the menu sheet             |
| 980        | Hero goes two-column, in even halves so the terminal lines fit    |
| 1180       | Hero columns become 1.15 to 0.85                                  |
| 1340       | Station rail appears: ticks only, names on hover                  |
| 1500       | Station rail also shows the current station's name                |

`DESKTOP_NAV` in `Nav.tsx` must match the 1120px rule in `Nav.module.css`; the
menu closes itself when the window crosses it. The rail thresholds come from
`--max-w`: narrower than that and the rail lies on top of the cards.

The scene runs on phones and tablets at the `low` setting, which is a budget of
pixels (`LIGHT_PIXELS` in `JourneyCanvas.tsx`), not a fixed ratio, so a phone
can draw at up to 2x and a laptop at 1x for the same cost. The ratio is read
once at mount, because a phone's address bar sliding away fires a resize. On a
screen taller than wide, `TALL_ANCHORS`, `TALL_SCALE` and `TALL_FADE` in
`JourneyScene.tsx` move the constellation beside the hero name and draw it
smaller and at about half brightness; the blend between the two layouts is
continuous in the aspect ratio.

**Contact droid (`Droids.tsx`, `three/robots/RobotBuddy.tsx`, `lib/wreck.ts`).**
Added 2026-10-27. The lane at the card's foot is only 112px, the owner having
asked for less empty space. The droid's canvas (`.stage`) rises from the lane
over the card as far as the highest `[data-perch]` button plus `HEADROOM`,
measured by `useReach`. It takes no clicks; the droid listens on the
`[data-droid-yard]` card and hit-tests its own projected box, and swallows a
press on itself so a link behind it is not followed.

- The camera's field of view follows the canvas height so one world unit stays
  `PX_PER_UNIT` pixels. Page and plane are mapped with `onPlane`/`onStage`,
  and buttons are re-measured from the live layout every frame it stands on one.
- Its walks alternate at the owner's request: one on the ground, the next up
  onto a button and back down. A trip is a `plan` of steps, so a click that
  interrupts it does not lose the rest.
- A double click fires a volley of three (`ROCKET_SLOTS`), one at each button.
  On impact `wreck()` sets `data-wreck='broken'`, then `'mend'` 4.2s later.
  The look is CSS on `.perch` in `Contact.module.css`: the two clip-path
  polygons have the same points so the bite eases shut.
- The glassy ball that follows the mouse in screenshots is `LiquidCursor`, not
  something the droid left behind.

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

- An absolutely positioned element is clipped by a scroller only if the
  scroller is, or contains, its containing block. The projects row's
  `.visually-hidden` "opens in a new tab" labels once escaped a non-positioned
  `overflow-x: auto` row, were placed against the section instead, and
  stretched a phone's page to 3,600px. Give a scroller `position: relative`.
- Restored or checked-out files arrive with CRLF endings (`core.autocrlf` is
  on), so a script matching multi-line text in them finds nothing. Convert the
  working copy to LF first; git stores LF either way.

- Do not import anything from `src/three/` into the main bundle, not even a
  small helper such as `rng`. It drags the module, and possibly three.js, out of
  the lazy chunk, and Save-Data visitors are promised they never download it.
- The mobile menu sheet covers the whole screen at `--z-overlay`, above the
  header. The header is raised over it while the menu is open (`.menuOpen`);
  without that the close button is underneath the sheet.
- A row of items with separators between them will sooner or later wrap and
  leave a separator hanging at the end of a line. The hero's role line draws
  each slash as a pseudo-element in the gap to the left of its item and clips
  the row, so a slash at the start of a line falls outside and is hidden.
- three.js keys a compiled shader by where it will be drawn. The nebula renders
  into an off-screen target, so `Warmup` in `JourneyScene.tsx` sets that target
  before calling `compileAsync` on it. Compile it against the screen and it is
  compiled a second time, synchronously, on first use.
- A filter or transform on an ancestor of the hero title interacts with the
  `overflow: hidden` masks used for the rise-in. Decide which side of the mask
  an effect belongs on before adding it.
- `.btn` in `global.css` sets `display` at the same specificity as CSS module
  classes. Module rules that need to hide a `.btn` use `!important`; see `.cta`
  in `Nav.module.css`.
