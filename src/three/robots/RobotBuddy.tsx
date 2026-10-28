import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CompileFirst } from "./CompileFirst";
import { CYCLE_LENGTH, DROID_HEIGHT, DroidLights, DuckDroid } from "./DuckDroid";
import { idleShot, restingPose, type DroidPose, type Shot } from "./pose";
import { ROCKET_SLOTS, Rockets } from "./Rockets";
import { useThemeColors } from "@/lib/useThemeColors";
import { mendAll, wreck } from "@/lib/wreck";

type Act = "walk" | "look" | "hop" | "hi" | "sleep" | "wake" | "angry" | "leap";

/** What it says during an act, each line from `at` seconds in until the next. */
type Line = { at: number; text: string };

/**
 * What it does after the act in hand. A trip up onto a button is planned as a
 * list of these, so a click that interrupts it does not lose the rest: the
 * droid answers, then carries on where it was.
 */
type Step =
  | { do: "act"; act: Act; seconds: number; lines?: Line[] }
  /** Jump onto a button, landing `share` of the way along its top. */
  | { do: "up"; el: HTMLElement; share: number; from: number }
  /** Jump back down to the ground. */
  | { do: "down" };

/** Where a button is, in the plane the droid walks in. */
type Perch = { el: HTMLElement; left: number; right: number; top: number; bottom: number };

const MAGIC = "Double click on me to see the magic!";
const GREETINGS = ["Hi!", "Hello there!", "Say hi to Irfan!", "Psst, email him!"];
const WAKINGS = ["Oh! Hi!", "I wasn't asleep!", "Hello!"];
/** Said on top of a button. */
const PERCHED = ["Nice view!", "Up here!", MAGIC];
/** A single click on it, and how it first greets the visitor. */
const HELLO: Line[] = [
  { at: 0, text: "Hi!" },
  { at: 1.2, text: MAGIC },
];
/** A double click on it, which it does not like. */
const CROSS: Line[] = [
  { at: 0, text: "Grrr!" },
  { at: 1.1, text: "Fire!" },
  { at: 2.3, text: "Boom!" },
  { at: 3.2, text: "Hmph." },
];

/** How likely each thing is to be what it does next, when left to itself. */
const NEXT: [Act, number][] = [
  ["walk", 5],
  ["look", 2],
  ["hop", 1.5],
  ["hi", 2],
  ["sleep", 1],
];

/** The droid's size: a little under 100px tall, whatever the stage's height. */
const SCALE = 0.72;
/**
 * How many pixels one unit of the plane it walks in takes up. The camera's
 * field of view follows the stage's height to keep this, so the droid stays
 * the same size however far up over the card the stage reaches.
 */
const PX_PER_UNIT = 83;
/** How far above the stage's bottom edge the ground falls, in pixels. */
const GROUND_PX = 2;
// Low and nearly level, so the feet nearest the viewer do not dip below the
// card's edge, which is where the canvas ends.
const CAMERA_Y = 0.8;
const CAMERA_Z = 10;
const CAMERA_AT = new THREE.Vector3(0, CAMERA_Y, CAMERA_Z);
const WALK_SPEED = 0.85;
/** Half the width of the box that counts as clicking on it, in world units. */
const REACH = 0.42;
/** A second click within this many milliseconds makes it a double click. */
const DOUBLE_CLICK = 320;
/** One hop, from gathering itself to landing. */
const HOP = 0.9;
/** Gathering itself before a jump, and the squash as it lands. */
const CROUCH = 0.2;
const LANDING = 0.3;
/**
 * How far below the stage's top a button must be to stand on, in pixels: room
 * for the droid and the top of its jump.
 */
const PERCH_ROOM = 130;
/** When, into its tantrum, each rocket fires. */
const FIRE_AT = 1.2;
const FIRE_GAP = 0.3;
const TAU = Math.PI * 2;
const ORIGIN = new THREE.Vector3(0, 0, 0);

const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

function pick(): Act {
  const total = NEXT.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [act, weight] of NEXT) {
    roll -= weight;
    if (roll < 0) return act;
  }
  return "walk";
}

const oneOf = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
const any = (lines: string[]): Line[] => [{ at: 0, text: oneOf(lines) }];

function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

const eye = new THREE.Vector3();
const ray = new THREE.Vector3();
const dot = new THREE.Vector3();

/**
 * Where a point of the stage, given as shares of its width and height, falls
 * on the plane the droid walks in (z = 0).
 */
function onPlane(camera: THREE.Camera, sx: number, sy: number, out: THREE.Vector2) {
  eye.setFromMatrixPosition(camera.matrixWorld);
  ray.set(sx * 2 - 1, 1 - sy * 2, 0.5).unproject(camera).sub(eye);
  const k = -eye.z / ray.z;
  return out.set(eye.x + ray.x * k, eye.y + ray.y * k);
}

/** Where a point on that plane shows on the stage, as shares. */
function onStage(camera: THREE.Camera, x: number, y: number, out: THREE.Vector2) {
  dot.set(x, y, 0).project(camera);
  return out.set((dot.x + 1) / 2, (1 - dot.y) / 2);
}

const corner = new THREE.Vector2();
const across = new THREE.Vector2();

/**
 * Where a button is now, in the droid's plane, or null if it is out of reach:
 * too near the top of the stage to stand on, or too narrow. Measured from the
 * live layout, so a button nudged up by its hover, or a card that has
 * reflowed, carries the droid with it.
 */
function measure(camera: THREE.Camera, stage: HTMLElement, el: HTMLElement): Perch | null {
  const s = stage.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  if (s.width < 1 || s.height < 1 || b.width < 1) return null;
  // Layout pixels per screen pixel, while the card is still zooming in.
  const px = stage.offsetHeight / s.height;
  if ((b.top - s.top) * px < PERCH_ROOM || (s.bottom - b.bottom) * px < 30) return null;
  const top = (b.top - s.top) / s.height;
  onPlane(camera, (b.left - s.left) / s.width, top, corner);
  onPlane(camera, (b.right - s.left) / s.width, (b.bottom - s.top) / s.height, across);
  if (across.x - corner.x < 0.9) return null;
  return { el, left: corner.x, right: across.x, top: corner.y, bottom: across.y };
}

/** Moves the speech bubble over the droid and sets what it says. */
function speak(
  el: HTMLElement | null,
  said: { text: string; width: number },
  say: { text: string; speaking: boolean; asleep: boolean; angry: boolean; x: number; above: number; room: number },
) {
  if (!el) return;
  if (say.speaking && said.text !== say.text) {
    el.textContent = say.text;
    said.text = say.text;
    said.width = el.offsetWidth;
  }
  // Held inside the stage, with the tail still pointing at the droid.
  const reach = said.width / 2 + 6;
  const left = say.room > reach * 2 ? clamp(say.x, reach, say.room - reach) : say.x;
  const tail = clamp(say.x - left, 12 - said.width / 2, said.width / 2 - 12);
  el.style.setProperty("--x", `${left.toFixed(1)}px`);
  el.style.setProperty("--y", `${say.above.toFixed(1)}px`);
  el.style.setProperty("--tail", `${tail.toFixed(1)}px`);
  el.toggleAttribute("data-show", say.speaking);
  el.toggleAttribute("data-sleep", say.asleep);
  el.toggleAttribute("data-angry", say.angry);
}

type Props = {
  /** Where it is drawn: its lane along the card's foot and the card above. */
  stage: RefObject<HTMLElement | null>;
  /** The speech bubble, moved along with it and filled with what it says. */
  bubble: RefObject<HTMLElement | null>;
};

/**
 * Keeps one unit of the plane at PX_PER_UNIT pixels whatever the stage's
 * height, and aims the camera so the ground falls just above the canvas's
 * bottom edge, which is the bottom edge of the card.
 */
function Frame() {
  const get = useThree((state) => state.get);
  const height = useThree((state) => state.size.height);
  useEffect(() => {
    const camera = get().camera as THREE.PerspectiveCamera;
    const tall = Math.max(height, 1);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tall / PX_PER_UNIT / 2 / CAMERA_Z));
    camera.updateProjectionMatrix();
    const below = Math.atan(CAMERA_Y / CAMERA_Z);
    const pitch = below - THREE.MathUtils.degToRad(camera.fov / 2) * (1 - (2 * GROUND_PX) / tall);
    camera.lookAt(0, CAMERA_Y - CAMERA_Z * Math.tan(pitch), 0);
    camera.updateMatrixWorld();
  }, [get, height]);
  return null;
}

function Buddy({ stage, bubble }: Props) {
  const colors = useThemeColors();
  const pose = useRef<DroidPose>(restingPose());
  const muzzles = useRef<THREE.Object3D[]>([]);
  const shots = useRef<Shot[]>(Array.from({ length: ROCKET_SLOTS }, idleShot));
  const aim = useRef(new THREE.Vector3());
  const said = useRef({ text: "", width: 0 });
  const mind = useRef({
    act: "hi" as Act,
    started: 0,
    until: 4.4,
    target: 0,
    lines: HELLO,
    plan: [] as Step[],
    /** Ground walks so far; every second one goes up onto a button. */
    trips: 0,
    /** The button it stands on, or null on the ground or in the air. */
    surface: null as HTMLElement | null,
    leap: { x0: 0, y0: 0, x1: 0, y1: 0, arc: 0, flight: 1, onto: null as HTMLElement | null },
    /** The pointer, as shares of the stage, or null when it is off the card. */
    pointer: null as { x: number; y: number } | null,
    /** The droid's box on the stage, as shares, for clicks. */
    box: { left: 0, right: 0, top: 0, bottom: 0 },
    over: false,
    // Clicks are counted and settled a moment later, so the first click of a
    // double click does not also get a hello.
    clicks: 0,
    clickedAt: 0,
    // Which way it fires, how many rockets are away, and the recoil.
    dir: 1,
    fired: 0,
    kick: 0,
    /** The button each rocket is meant for, and where across it it lands. */
    volley: [] as ({ el: HTMLElement; across: number } | null)[],
    /** For each rocket slot, the launch whose impact has been dealt with. */
    struck: [] as number[],
  });

  useEffect(() => {
    const el = stage.current;
    const yard = el?.closest<HTMLElement>("[data-droid-yard]");
    if (!el || !yard) return;
    const m = mind.current;
    /** Records where the pointer is, and says whether it is on the droid. */
    const locate = (e: MouseEvent) => {
      const box = el.getBoundingClientRect();
      const x = (e.clientX - box.left) / box.width;
      const y = (e.clientY - box.top) / box.height;
      m.pointer = x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null;
      const b = m.box;
      return m.pointer !== null && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
    };
    const onMove = (e: PointerEvent) => void locate(e);
    const onLeave = () => (m.pointer = null);
    const onDown = (e: PointerEvent) => {
      if (!locate(e)) return;
      const now = performance.now();
      m.clicks = now - m.clickedAt < DOUBLE_CLICK ? m.clicks + 1 : 1;
      m.clickedAt = now;
    };
    // A press on the droid is for the droid: it starts no text selection, and
    // a link it happens to be in front of is not followed.
    const onPress = (e: MouseEvent) => {
      if (locate(e)) e.preventDefault();
    };
    yard.addEventListener("pointermove", onMove);
    yard.addEventListener("pointerleave", onLeave);
    yard.addEventListener("pointerdown", onDown);
    yard.addEventListener("mousedown", onPress);
    yard.addEventListener("click", onPress, true);
    return () => {
      yard.removeEventListener("pointermove", onMove);
      yard.removeEventListener("pointerleave", onLeave);
      yard.removeEventListener("pointerdown", onDown);
      yard.removeEventListener("mousedown", onPress);
      yard.removeEventListener("click", onPress, true);
      yard.style.cursor = "";
      // Nothing is left broken once the droid has gone.
      mendAll();
    };
  }, [stage]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const p = pose.current;
    const m = mind.current;
    const camera = state.camera;
    const el = stage.current;
    const yard = el?.closest<HTMLElement>("[data-droid-yard]");
    const view = state.viewport.getCurrentViewport(camera, ORIGIN);
    const half = view.width / 2;
    const edge = Math.max(half - 0.6, 0.4);

    const find = (button: HTMLElement) => (el ? measure(camera, el, button) : null);
    const perches = () =>
      yard ? [...yard.querySelectorAll<HTMLElement>("[data-perch]")].map(find).filter((s): s is Perch => s !== null) : [];

    /** Picks the buttons for a volley, and turns toward them. */
    const aimVolley = () => {
      const marks = shuffle(perches().filter((s) => s.el !== m.surface));
      m.volley = Array.from({ length: ROCKET_SLOTS }, (_, i) =>
        marks.length ? { el: marks[i % marks.length].el, across: 0.3 + Math.random() * 0.4 } : null,
      );
      // With nothing to aim at, it fires across the wider stretch of card.
      const mean = marks.length ? marks.reduce((sum, s) => sum + (s.left + s.right) / 2, 0) / marks.length : -p.x;
      m.dir = Math.sign(mean - p.x) || 1;
      m.fired = 0;
    };

    const begin = (act: Act, seconds: number, lines: Line[] = []) => {
      m.act = act;
      m.started = t;
      m.until = t + seconds;
      m.lines = act === "sleep" ? [{ at: 0, text: "z z z" }] : lines;
      if (act === "angry") aimVolley();
    };

    const walkTo = (x: number) => {
      begin("walk", 30);
      m.target = clamp(x, -edge, edge);
    };

    /** Somewhere else along the card, not just a shuffle on the spot. */
    const wander = () => {
      let target: number;
      do target = (Math.random() * 2 - 1) * edge;
      while (Math.abs(target - p.x) < edge * 0.3);
      walkTo(target);
    };

    /** A jump from where it stands to `x` on a button, or to the ground. */
    const leapTo = (x: number, onto: Perch | null) => {
      const y1 = onto ? onto.top : 0;
      const rise = y1 - p.ground;
      // The arc that clears the higher end by `clear`: a parabola through
      // both ends, solved for the height of its top.
      const clear = rise > 0 ? 0.3 : 0.25;
      const span = Math.abs(rise) + 2 * clear;
      m.leap = {
        x0: p.x,
        y0: p.ground,
        x1: x,
        y1,
        arc: (span + Math.sqrt(span * span - rise * rise)) / 4,
        flight: 0.5 + 0.09 * Math.abs(rise) + 0.08 * Math.abs(x - p.x),
        onto: onto?.el ?? null,
      };
      m.surface = null;
      begin("leap", CROUCH + m.leap.flight + LANDING);
    };

    /** Off the nearer end of the button it is on, down to the ground. */
    const leapDown = () => {
      const spot = m.surface ? find(m.surface) : null;
      const x = spot
        ? p.x - spot.left < spot.right - p.x
          ? spot.left - 0.75
          : spot.right + 0.75
        : p.x + (p.x > 0 ? -0.8 : 0.8);
      leapTo(clamp(x, -edge, edge), null);
    };

    /** Walks over to a button, jumps up, has a look round, and jumps down. */
    const perchTrip = () => {
      const options = perches();
      if (!options.length) return false;
      const spot = oneOf(options);
      const share = 0.3 + Math.random() * 0.4;
      const landing = lerp(spot.left + 0.35, spot.right - 0.35, share);
      // It takes off from beside the button, on the side it comes from.
      const from = clamp(landing + (p.x < landing ? -0.9 : 0.9), -edge, edge);
      m.plan = [
        { do: "up", el: spot.el, share, from },
        { do: "act", act: "hi", seconds: 3, lines: any(PERCHED) },
        { do: "act", act: "look", seconds: 2 },
        { do: "down" },
        { do: "act", act: "look", seconds: 1.2 },
      ];
      walkTo(from);
      return true;
    };

    const hello = () => {
      const magic = Math.random() < 0.5;
      begin("hi", magic ? 3.4 : 2.4, magic ? [{ at: 0, text: MAGIC }] : any(GREETINGS));
    };

    const next = () => {
      // A stalled frame can skip a landing whole; land it before moving on.
      if (m.act === "leap") {
        p.x = m.leap.x1;
        p.ground = m.leap.y1;
        m.surface = m.leap.onto;
      }
      const step = m.plan.shift();
      if (step?.do === "act") return begin(step.act, step.seconds, step.lines);
      if (step?.do === "up") {
        // Knocked off course by a click on the way: walk back to the spot first.
        if (Math.abs(p.x - step.from) > 0.3) {
          m.plan.unshift(step);
          return walkTo(step.from);
        }
        const spot = find(step.el);
        if (spot) return leapTo(lerp(spot.left + 0.35, spot.right - 0.35, step.share), spot);
        // The button has gone out of reach; give up the trip.
        m.plan = [];
      }
      if (step?.do === "down" || m.surface) return leapDown();
      if (m.act === "walk") return begin("look", 1.6);
      if (m.act === "sleep") return begin("wake", 1.8, any(WAKINGS));
      const act = pick();
      if (act === "walk") {
        // Every other walk ends with a jump up onto a button.
        if (m.trips++ % 2 === 0 || !perchTrip()) wander();
        return;
      }
      if (act === "hi") return hello();
      begin(act, act === "hop" ? HOP * 2 : act === "sleep" ? 6 : 2.6);
    };

    /** Sends a rocket out of one tube of the pod, at its button. */
    const fire = (slot: number) => {
      const tubes = muzzles.current;
      const mouth = tubes[slot % Math.max(tubes.length, 1)];
      if (!mouth) return;
      const shot = shots.current[slot];
      const dir = aim.current;
      mouth.getWorldPosition(shot.from);
      mouth.getWorldDirection(dir);
      const mark = m.volley[slot];
      const spot = mark ? find(mark.el) : null;
      if (mark && spot) {
        // Into the upper part of its face, where the bite will be.
        shot.to.set(lerp(spot.left, spot.right, mark.across), lerp(spot.top, spot.bottom, 0.3), 0);
      } else {
        m.volley[slot] = null;
        // Far enough in from the card's edge that the burst is seen whole.
        shot.to.set(m.dir * (half - 0.7), 0.45 + slot * 0.22, 0);
      }
      const across = Math.abs(shot.to.x - shot.from.x);
      // The curve leaves along the tube, so the rocket comes out the way the
      // pod points, then bends round to its mark.
      const out = Math.max(0.5, Math.abs(dir.x) > 0.3 ? (across * 0.5) / Math.abs(dir.x) : across * 0.5);
      shot.bend.copy(shot.from).addScaledVector(dir, out);
      shot.bend.y = Math.min(shot.bend.y, view.height);
      shot.duration = 0.45 + shot.from.distanceTo(shot.to) * 0.09;
      shot.at = t;
      m.kick = 0.9;
    };

    // A rocket that has reached its button breaks it.
    shots.current.forEach((shot, i) => {
      if (shot.at < 0 || m.struck[i] === shot.at || t < shot.at + shot.duration) return;
      m.struck[i] = shot.at;
      const mark = m.volley[i];
      if (mark) wreck(mark.el, mark.across);
    });

    // Settle the clicks: one is a hello, two is a tantrum. Mid-jump they wait
    // for it to land, and mid-tantrum they are ignored.
    if (m.act === "angry") m.clicks = 0;
    if (m.clicks > 0 && m.act !== "leap") {
      if (m.clicks >= 2) {
        m.clicks = 0;
        begin("angry", 4.2, CROSS);
      } else if (performance.now() - m.clickedAt > DOUBLE_CLICK) {
        m.clicks = 0;
        if (m.act === "sleep") begin("wake", 3.2, any(WAKINGS));
        else begin("hi", 4, HELLO);
      }
    }

    if (t >= m.until) next();

    // Standing on a button, it rides along with it; if the button has gone
    // out of reach, it jumps down.
    if (m.surface && m.act !== "leap") {
      const spot = find(m.surface);
      if (spot) {
        p.ground = spot.top;
        p.x = clamp(p.x, spot.left + 0.25, spot.right - 0.25);
      } else {
        m.plan = m.plan.filter((s) => s.do !== "down");
        leapDown();
      }
    } else if (m.act !== "leap") {
      p.ground = 0;
    }

    const since = t - m.started;
    let stride = 0;
    let heading = 0;
    let crouch = 0;
    let squash = 0;
    let eyes = Math.abs(Math.sin(t * 0.9)) > 0.995 ? 0 : 1;
    let lookYaw = 0;
    let lookPitch = 0;
    let lift = 0;
    let flap = 0;
    let talk = 0;
    let anger = 0;
    let launcher = 0;
    let moved = 0;

    switch (m.act) {
      case "walk": {
        const gap = m.target - p.x;
        const dir = Math.sign(gap) || 1;
        // Eases into its stride and out of it again as it arrives.
        stride = Math.min(1, Math.abs(gap) / 0.3);
        moved = Math.min(WALK_SPEED * Math.max(p.stride, 0.15) * dt, Math.abs(gap));
        p.x += dir * moved;
        // Side on, turned a little toward the viewer so its face shows.
        heading = dir * (Math.PI / 2 - 0.4);
        if (Math.abs(m.target - p.x) < 0.005) m.until = t;
        break;
      }
      case "look": {
        heading = 0.2 * Math.sin(t * 0.7);
        // At the pointer if it is over the card, otherwise just about.
        lookYaw =
          m.pointer !== null
            ? clamp((onPlane(camera, m.pointer.x, m.pointer.y, corner).x - p.x) * 0.4, -0.9, 0.9)
            : Math.sin(since * 2.2) * 0.7;
        lookPitch = -0.1;
        break;
      }
      case "hop": {
        // Gathers itself, springs up with its wings going, and lands with a
        // squash; the height follows a parabola, as a real jump would.
        heading = 0.3;
        const k = (since % HOP) / HOP;
        if (k < 0.2) {
          crouch = 0.3;
          squash = 0.6;
        } else if (k < 0.66) {
          const a = (k - 0.2) / 0.46;
          lift = 4 * a * (1 - a) * 0.3;
          squash = a < 0.5 ? -0.5 : 0;
          flap = 1;
        } else {
          crouch = 0.2;
          squash = 0.5;
        }
        break;
      }
      case "leap": {
        // Crouches, springs off with its wings going, flies a parabola onto
        // the button (or down off it), and lands with a squash. The legs tuck
        // up in the air.
        const L = m.leap;
        heading = (Math.sign(L.x1 - L.x0) || 1) * (Math.PI / 2 - 0.4);
        if (since < CROUCH) {
          crouch = 0.35;
          squash = 0.6;
          lookPitch = L.y1 > L.y0 ? -0.3 : 0.2;
        } else if (since < CROUCH + L.flight) {
          const s = (since - CROUCH) / L.flight;
          const y = L.y0 + (L.y1 - L.y0) * s + 4 * L.arc * s * (1 - s);
          const tuck = 0.15 * Math.sin(Math.PI * s);
          p.x = lerp(L.x0, L.x1, s);
          p.ground = y - tuck;
          lift = tuck;
          squash = s < 0.35 ? -0.5 : 0;
          flap = 1;
          lookPitch = s < 0.6 && L.y1 > L.y0 ? -0.2 : 0.15;
        } else {
          p.x = L.x1;
          p.ground = L.y1;
          m.surface = L.onto;
          crouch = 0.25;
          squash = 0.55;
        }
        break;
      }
      case "hi": {
        // Faces the viewer, bobs twice with its wings waving; for a second
        // line it cocks its head to ask.
        lift = since < 0.9 ? Math.abs(Math.sin((since / 0.9) * TAU)) * 0.14 : 0;
        const asking = m.lines.length > 1 && since >= m.lines[1].at;
        lookYaw = asking ? 0.35 : Math.sin(since * 6) * 0.15;
        lookPitch = asking ? -0.15 : -0.25;
        flap = since < 1.3 ? 1 : 0;
        talk = m.lines.some((line) => since >= line.at && since < line.at + 0.8) ? 1 : 0;
        break;
      }
      case "sleep": {
        crouch = 1;
        eyes = 0;
        heading = 0.25;
        lookPitch = 0.1 + Math.sin(t * 1.4) * 0.05;
        break;
      }
      case "wake": {
        // A start, a flutter, a look round.
        lift = since < 0.35 ? Math.sin((since / 0.35) * Math.PI) * 0.24 : 0;
        squash = since < 0.35 ? -0.4 : 0;
        lookPitch = since < 1 ? -0.45 : 0;
        lookYaw = Math.sin(since * 5) * 0.4;
        flap = since < 0.7 ? 1 : 0;
        talk = since > 0.3 && since < 1.1 ? 1 : 0;
        break;
      }
      case "angry": {
        // Turns side on and glares, stamps twice, raises the pod, fires a
        // rocket at each button, then puts it away and calms down.
        heading = m.dir * (Math.PI / 2);
        anger = since < 3.4 ? 1 : 0;
        lookPitch = 0.12;
        if (since < 0.8) {
          const stamp = (since % 0.4) / 0.4;
          lift = Math.sin(stamp * Math.PI) * 0.06;
          squash = stamp > 0.75 ? 0.6 : -0.2;
        }
        launcher = since > 0.6 && since < 2.9 ? 1 : 0;
        talk = m.lines.some((line) => since >= line.at && since < line.at + 0.5) ? 1 : 0;
        while (m.fired < ROCKET_SLOTS && since >= FIRE_AT + m.fired * FIRE_GAP) fire(m.fired++);
        break;
      }
    }

    // Each launch shoves it back a little, but not off its button.
    if (m.kick > 0.01) {
      p.x -= m.dir * m.kick * dt;
      squash -= m.kick * 0.4;
      m.kick = damp(m.kick, 0, 9, dt);
      const spot = m.surface ? find(m.surface) : null;
      p.x = spot ? clamp(p.x, spot.left + 0.25, spot.right - 0.25) : clamp(p.x, -half + 0.3, half - 0.3);
    }

    p.stride = damp(p.stride, stride, 6, dt);
    // The cycle advances by distance walked, so planted feet never slide.
    p.phase += (moved / (CYCLE_LENGTH * SCALE * Math.max(p.stride, 0.15))) * TAU;
    p.heading = damp(p.heading, heading, 6, dt);
    p.crouch = damp(p.crouch, crouch, m.act === "sleep" ? 2 : 10, dt);
    p.squash = damp(p.squash, squash, 14, dt);
    p.eyes = damp(p.eyes, eyes, m.act === "sleep" ? 2 : 25, dt);
    p.lookYaw = damp(p.lookYaw, lookYaw, 6, dt);
    p.lookPitch = damp(p.lookPitch, lookPitch, 6, dt);
    p.flap = damp(p.flap, flap, 10, dt);
    p.talk = damp(p.talk, talk, 12, dt);
    p.anger = damp(p.anger, anger, 8, dt);
    p.launcher = damp(p.launcher, launcher, 7, dt);
    p.lift = lift;

    // Its box on the stage, for clicks, from its feet to its antenna.
    const feet = p.ground + p.lift;
    const head = feet + DROID_HEIGHT * SCALE;
    onStage(camera, p.x - REACH, feet - 0.05, corner);
    onStage(camera, p.x + REACH, head, across);
    m.box.left = corner.x;
    m.box.right = across.x;
    m.box.top = across.y;
    m.box.bottom = corner.y;

    // The bubble rides above its antenna, and says whatever it is saying.
    const line = m.lines.reduce<Line | null>((said, l) => (since >= l.at ? l : said), null);
    onStage(camera, p.x, head, corner);
    speak(bubble.current, said.current, {
      text: line?.text ?? "",
      speaking: line !== null,
      asleep: m.act === "sleep",
      angry: m.act === "angry",
      x: corner.x * state.size.width,
      above: (1 - corner.y) * state.size.height + 10,
      room: state.size.width,
    });

    // A pointer cursor while over it, since it can be clicked.
    const b = m.box;
    const over =
      m.pointer !== null &&
      m.pointer.x >= b.left &&
      m.pointer.x <= b.right &&
      m.pointer.y >= b.top &&
      m.pointer.y <= b.bottom;
    if (yard && over !== m.over) yard.style.cursor = over ? "pointer" : "";
    m.over = over;
  });

  return (
    <>
      <DroidLights colors={colors} />
      <DuckDroid pose={pose} colors={colors} scale={SCALE} muzzles={muzzles} />
      <Rockets shots={shots} colors={colors} camera={CAMERA_AT} />
    </>
  );
}

/**
 * The droid that lives along the foot of the contact card: it walks about,
 * jumps up onto the buttons and back down, hops, sits down for a nap, and
 * says hello. Click it and it says hello to you; double-click it and it loses
 * its temper and fires rockets at the buttons, which break and then rebuild.
 */
export default function RobotBuddy({ stage, bubble, active }: Props & { active: boolean }) {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <Canvas
      // The stage reaches well up the card, so it is held under 2x.
      dpr={[1, 1.5]}
      frameloop={active && ready ? "always" : "never"}
      camera={{ fov: 13, near: 0.1, far: 40, position: [0, CAMERA_Y, CAMERA_Z] }}
      gl={{ antialias: true, alpha: true }}
      // Measured by layout size, not by its on-screen box: the card scales in
      // as it arrives, and a canvas sized mid-entrance stayed too small, its
      // ground line floating above the card's edge.
      resize={{ offsetSize: true }}
      // The stage lies over the card's buttons and links, so it must let every
      // click through. R3F sets pointer-events: auto on the wrapper it puts
      // round the canvas, which would swallow them; this style is applied
      // after its own. The droid hears clicks through the card instead.
      style={{ pointerEvents: "none" }}
    >
      <Frame />
      <Buddy stage={stage} bubble={bubble} />
      <CompileFirst onReady={handleReady} />
    </Canvas>
  );
}
