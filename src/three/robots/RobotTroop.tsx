import { useCallback, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CompileFirst } from "./CompileFirst";
import { DroidLights, DuckDroid } from "./DuckDroid";
import { restingPose, type DroidPose } from "./pose";
import { useThemeColors } from "@/lib/useThemeColors";

/** Where each droid of the troop walks, nearest the viewer first: [across, along]. */
const FILE: [number, number][] = [
  [0, 1.15],
  [-0.38, 0],
  [0.38, -1.15],
];
/** Scroll speed, in pixels a second, at which they are at a full run. */
const FULL_RUN = 1100;
/** Seconds standing still before they sit down for a nap. */
const NAP_AFTER = 9;
const HOP_SECONDS = 0.45;

const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

type Props = {
  /** The timeline; its role nodes are what the leader hops over. */
  host: RefObject<HTMLElement | null>;
  /** The box the canvas sits in, whose middle is the line they run on. */
  frame: RefObject<HTMLElement | null>;
};

function Troop({ host, frame }: Props) {
  const colors = useThemeColors();
  // One pose per droid, in file order. Three refs rather than one ref of an
  // array, so each droid is handed its own and nothing reads them in render.
  const lead = useRef<DroidPose>({ ...restingPose(), x: FILE[0][0], z: FILE[0][1] });
  const middle = useRef<DroidPose>({ ...restingPose(), x: FILE[1][0], z: FILE[1][1] });
  const last = useRef<DroidPose>({ ...restingPose(), x: FILE[2][0], z: FILE[2][1] });
  const run = useRef({
    lastY: -1,
    velocity: 0,
    direction: 1,
    still: 0,
    hops: FILE.map(() => -1),
    sides: new Map<Element, number>(),
    blinkAt: 2,
  });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const r = run.current;
    const t = state.clock.elapsedTime;

    // Scroll speed, eased, is how fast they run; its sign is which way.
    const y = window.scrollY;
    const raw = r.lastY < 0 ? 0 : (y - r.lastY) / Math.max(dt, 1e-3);
    r.lastY = y;
    r.velocity = damp(r.velocity, raw, 6, dt);
    const speed = Math.abs(r.velocity);
    if (speed > 40) r.direction = Math.sign(r.velocity);
    r.still = speed < 25 ? r.still + dt : 0;

    // A role's node crossing the line they run on sends them over it, the
    // leader first and the others a beat behind.
    const line = frame.current?.getBoundingClientRect();
    if (line && host.current) {
      const mid = line.top + line.height / 2;
      for (const node of host.current.querySelectorAll("[data-node]")) {
        const box = node.getBoundingClientRect();
        const side = Math.sign(box.top + box.height / 2 - mid);
        const before = r.sides.get(node);
        if (before !== undefined && before !== side && side !== 0) {
          const order = r.direction > 0 ? [0, 1, 2] : [2, 1, 0];
          order.forEach((d, k) => (r.hops[d] = t + k * 0.14));
        }
        if (side !== 0) r.sides.set(node, side);
      }
    }

    // Now and then everybody blinks, not quite together.
    if (t > r.blinkAt) r.blinkAt = t + 2.5 + Math.random() * 3;
    const napping = r.still > NAP_AFTER;

    [lead, middle, last].forEach(({ current: p }, i) => {
      const stride = Math.min(speed / FULL_RUN, 1);
      p.stride = damp(p.stride, napping ? 0 : stride, 8, dt);
      p.phase += dt * (2.5 + p.stride * 11) * (1 + i * 0.04);
      // Facing down the page toward the viewer, or turned round to go back up.
      p.heading = damp(p.heading, r.direction > 0 ? 0 : Math.PI, 5, dt);
      p.crouch = damp(p.crouch, napping ? 1 : 0, napping ? 1.5 : 6, dt);

      // Standing about, they look around; running, they look ahead.
      const idle = p.stride < 0.08 && !napping;
      p.lookYaw = damp(p.lookYaw, idle ? Math.sin(t * 0.8 + i * 2.1) * 0.7 : 0, 3, dt);
      p.lookPitch = damp(p.lookPitch, idle ? Math.sin(t * 0.5 + i) * 0.15 : 0.1, 3, dt);

      const blinking = Math.abs(t - (r.blinkAt - 0.1 * i)) < 0.07;
      p.eyes = damp(p.eyes, napping || blinking ? 0 : 1, napping ? 2 : 30, dt);

      const since = t - r.hops[i];
      p.lift = since >= 0 && since < HOP_SECONDS ? Math.sin((since / HOP_SECONDS) * Math.PI) * 0.4 : 0;
    });
  });

  return (
    <>
      <DroidLights colors={colors} />
      <DuckDroid pose={lead} colors={colors} scale={0.85} />
      <DuckDroid pose={middle} colors={colors} scale={0.85} />
      <DuckDroid pose={last} colors={colors} scale={0.85} />
    </>
  );
}

/**
 * The troop of droids that runs down the experience timeline. Seen from above
 * and in front, on the spine, at the line the page is read at: the page scrolls
 * up beneath them, so they run down it.
 */
export default function RobotTroop({ host, frame, active }: Props & { active: boolean }) {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={active && ready ? "always" : "never"}
      camera={{ fov: 34, near: 0.1, far: 30, position: [0, 6.2, 4.2] }}
      onCreated={({ camera }) => camera.lookAt(0, 0.3, 0)}
      gl={{ antialias: true, alpha: true }}
    >
      <Troop host={host} frame={frame} />
      <CompileFirst onReady={handleReady} />
    </Canvas>
  );
}
