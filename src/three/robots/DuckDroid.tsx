import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ThemeColors } from "@/lib/useThemeColors";
import type { DroidPose } from "./pose";

/** Thigh and shin length. */
const BONE = 0.3;
/** Hip height standing, with the knees a little bent. */
const HIP_Y = 0.56;
/** From the ankle down to the sole of the foot. */
const SOLE = 0.035;
/** Half the length of a step, and how high a foot lifts as it swings through. */
const STEP = 0.15;
const STEP_LIFT = 0.1;
const TAU = Math.PI * 2;

/**
 * How far the body travels in one turn of the walk cycle, unscaled. A
 * controller advances the phase by distance over this, so a planted foot moves
 * back exactly as fast as the body moves forward and never slides.
 */
export const CYCLE_LENGTH = 4 * STEP;

/** The tip of the antenna above the ground, unscaled; speech goes above it. */
export const DROID_HEIGHT = HIP_Y + 0.7 + 0.42;

/** One leg, bending forward at the knee. */
type Leg = { hip: THREE.Group; knee: THREE.Group; foot: THREE.Group };

/**
 * Where a foot should be relative to its hip at this point in the cycle. For
 * the first half it is planted and slides back under the body at an even
 * speed; for the second it lifts and swings forward to land again.
 */
function footAt(phase: number, stride: number) {
  const u = (((phase / TAU) % 1) + 1) % 1;
  if (u < 0.5) return { z: STEP * stride * (1 - 4 * u), up: 0, curl: 0 };
  const s = (u - 0.5) * 2;
  const arc = Math.sin(Math.PI * s);
  return {
    z: STEP * stride * (2 * s * s * (3 - 2 * s) - 1),
    up: arc * STEP_LIFT * stride,
    // The toes droop as the foot leaves the ground and flatten to land.
    curl: arc * 0.5 * stride,
  };
}

/**
 * Two-bone inverse kinematics in the leg's own plane: given where the ankle
 * must be (forward, and how far below the hip), find the hip and knee angles.
 * The foot is turned back by their sum so it stays level with the ground.
 */
function reach(leg: Leg, forward: number, drop: number, curl: number) {
  const span = Math.min(Math.hypot(forward, drop), BONE * 2 * 0.999);
  const aim = Math.atan2(forward, drop);
  const bend = Math.acos(span / (BONE * 2));
  leg.hip.rotation.x = -(aim + bend);
  leg.knee.rotation.x = 2 * bend;
  leg.foot.rotation.x = aim - bend + curl;
}

/**
 * A small two-legged droid in the manner of the open-source "duck" robots:
 * a rounded body with folding wings, a head on a short neck with a visor, two
 * glowing eyes, a bill and an antenna, and thin legs. Built from primitives,
 * no model file to load.
 */
export function DuckDroid({
  pose,
  colors,
  scale = 1,
  muzzles,
}: {
  pose: RefObject<DroidPose>;
  colors: ThemeColors;
  scale?: number;
  /** Filled with the mouths of its rocket pod, so rockets know where to start. */
  muzzles?: RefObject<THREE.Object3D[]>;
}) {
  const root = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const jaw = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const antenna = useRef<THREE.Group>(null);
  const brows = useRef<THREE.Mesh[]>([]);
  const launcher = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const legs = useRef<Leg[]>([]);
  const wings = useRef<THREE.Group[]>([]);
  // The antenna is on a spring, so it wobbles after every bob and hop.
  const spring = useRef({ y: Number.NaN, v: 0, angle: 0, speed: 0 });

  const parts = useMemo(() => {
    // Pale on the dark theme and inked on the light one, so it always stands
    // off the card; the trim is a shade off the shell and the visor darker.
    const bg = new THREE.Color(colors.bg);
    const text = new THREE.Color(colors.text);
    const black = new THREE.Color(0x000000);
    const light = bg.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
    const trim = light ? text.clone().lerp(bg, 0.3) : bg.clone().lerp(text, 0.16);
    const visor = light ? text.clone().lerp(black, 0.5) : bg.clone().lerp(black, 0.35);
    const amber = new THREE.Color(colors.amber);
    return {
      torso: new RoundedBoxGeometry(0.64, 0.42, 0.76, 5, 0.18),
      belly: new RoundedBoxGeometry(0.5, 0.1, 0.58, 3, 0.045),
      plate: new RoundedBoxGeometry(0.34, 0.04, 0.36, 2, 0.016),
      // A unit sphere, scaled into the wings and their seams.
      ball: new THREE.SphereGeometry(1, 20, 14),
      tail: new RoundedBoxGeometry(0.28, 0.14, 0.2, 3, 0.06),
      head: new RoundedBoxGeometry(0.5, 0.36, 0.42, 4, 0.14),
      visor: new RoundedBoxGeometry(0.4, 0.2, 0.05, 3, 0.024),
      bill: new RoundedBoxGeometry(0.26, 0.045, 0.15, 3, 0.02),
      jaw: new RoundedBoxGeometry(0.22, 0.03, 0.12, 3, 0.013),
      foot: new RoundedBoxGeometry(0.17, SOLE, 0.21, 2, 0.015),
      shell: new THREE.MeshStandardMaterial({ color: text, roughness: 0.38, metalness: 0.06 }),
      trim: new THREE.MeshStandardMaterial({ color: trim, roughness: 0.55, metalness: 0.35 }),
      glass: new THREE.MeshStandardMaterial({ color: visor, roughness: 0.16, metalness: 0.6 }),
      amber: new THREE.MeshStandardMaterial({ color: amber, roughness: 0.5 }),
      amberDeep: new THREE.MeshStandardMaterial({ color: amber.clone().lerp(black, 0.25), roughness: 0.55 }),
      brow: new RoundedBoxGeometry(0.12, 0.026, 0.02, 2, 0.01),
      bracket: new RoundedBoxGeometry(0.2, 0.1, 0.16, 2, 0.03),
      // The eyes and brows glow cyan, and turn red as it gets cross.
      calm: new THREE.Color(colors.cyan),
      cross: new THREE.Color(colors.danger),
      glow: new THREE.MeshStandardMaterial({
        color: colors.cyan,
        emissive: colors.cyan,
        emissiveIntensity: 1.8,
      }),
      ember: new THREE.MeshStandardMaterial({
        color: colors.danger,
        emissive: colors.danger,
        emissiveIntensity: 1.2,
      }),
      stripe: new THREE.MeshStandardMaterial({
        color: colors.accent,
        emissive: colors.accent,
        emissiveIntensity: 0.9,
      }),
    };
  }, [colors]);

  useFrame((state, delta) => {
    const p = pose.current;
    const r = root.current;
    if (!r || !hips.current || !body.current || !head.current || !eyes.current) return;
    const dt = Math.min(Math.max(delta, 1e-3), 0.05);
    const t = state.clock.elapsedTime;
    const s = p.stride;
    const sit = p.crouch;

    r.position.set(p.x, p.ground + p.lift, p.z);
    r.rotation.y = p.heading;

    // Lowest as each foot lands, highest as it passes under the body.
    const bob = 0.025 * s * (1 + Math.cos(2 * p.phase)) * 0.5;
    const hipY = HIP_Y - sit * 0.38 - Math.max(0, p.squash) * 0.08 - bob;
    hips.current.position.y = hipY;

    // Each foot is placed on the ground and the leg bends to reach it, so the
    // feet stay planted whether it walks, crouches or lands. In the air the
    // legs tuck up a little.
    const drop = hipY - SOLE - Math.min(p.lift * 0.7, 0.12);
    legs.current.forEach((leg, i) => {
      const foot = footAt(p.phase + (i ? Math.PI : 0), s);
      reach(leg, foot.z, drop - foot.up, foot.curl);
    });

    // The waddle: the body leans and shifts over whichever foot is down.
    const b = body.current;
    b.rotation.z = Math.sin(p.phase) * 0.12 * s;
    b.rotation.x = 0.1 * s + sit * 0.1;
    b.position.x = -Math.sin(p.phase) * 0.025 * s;
    const breathe = Math.sin(t * (2.2 - sit)) * (0.012 + 0.02 * sit);
    b.scale.set(1 + p.squash * 0.07, 1 - p.squash * 0.11 + breathe, 1 + p.squash * 0.07);

    wings.current.forEach((wing, i) => {
      const side = i ? 1 : -1;
      const open = 0.05 + 0.1 * s + p.flap * (0.55 + 0.45 * Math.sin(t * 17));
      wing.rotation.z = side * open * (1 - sit);
    });
    if (tail.current) {
      tail.current.rotation.y = Math.sin(p.phase) * 0.35 * s + Math.sin(t * 1.7) * 0.06 * (1 - sit);
    }

    // The head steadies itself against the waddle, lags the bob a little, and
    // droops in sleep.
    const h = head.current;
    h.position.y = 0.7 + bob * 0.4;
    h.rotation.y = p.lookYaw;
    h.rotation.x = p.lookPitch + sit * 0.35 - b.rotation.x * 0.6;
    h.rotation.z = -b.rotation.z * 0.7 - p.lookYaw * 0.2;
    // Cross: the eyes narrow and redden, and the brows slant down to meet them.
    eyes.current.scale.y = Math.max(0.08, p.eyes) * (1 - 0.4 * p.anger);
    eyes.current.position.set(THREE.MathUtils.clamp(p.lookYaw * 0.03, -0.02, 0.02), 0.03 - 0.012 * p.anger, 0.222);
    parts.glow.color.lerpColors(parts.calm, parts.cross, p.anger);
    parts.glow.emissive.copy(parts.glow.color);
    brows.current.forEach((brow, i) => {
      const side = i ? 1 : -1;
      brow.scale.set(Math.max(p.anger, 0.001), 1, 1);
      brow.position.y = 0.1 - 0.018 * p.anger;
      brow.rotation.z = side * 0.5 * p.anger;
    });

    // The rocket pod rises out of its back and tips up to aim.
    if (launcher.current) {
      launcher.current.position.y = 0.2 + p.launcher * 0.33;
      launcher.current.rotation.x = -0.5 * p.launcher;
    }
    if (jaw.current) jaw.current.rotation.x = p.talk * 0.45 * Math.abs(Math.sin(t * 13));

    if (antenna.current) {
      const sp = spring.current;
      const y = p.lift + hipY;
      if (Number.isNaN(sp.y)) sp.y = y;
      const v = (y - sp.y) / dt;
      const push = THREE.MathUtils.clamp((v - sp.v) / dt, -30, 30);
      sp.y = y;
      sp.v = v;
      sp.speed += (-110 * (sp.angle + 0.18 * s) - 6 * sp.speed - push * 0.45) * dt;
      sp.angle += sp.speed * dt;
      antenna.current.rotation.x = sp.angle;
      antenna.current.rotation.z = -0.2 - b.rotation.z * 0.8;
    }

    if (beacon.current) {
      beacon.current.emissiveIntensity = (0.6 + 0.9 * (0.5 + 0.5 * Math.sin(t * 3.1))) * (0.3 + 0.7 * p.eyes);
    }
  });

  const leg = (side: -1 | 1, index: number) => (
    <group
      key={side}
      position={[side * 0.17, 0, 0.02]}
      ref={(g) => {
        if (!g) return;
        legs.current[index] = {
          hip: g,
          knee: g.getObjectByName("knee") as THREE.Group,
          foot: g.getObjectByName("foot") as THREE.Group,
        };
      }}
    >
      <mesh material={parts.trim}>
        <sphereGeometry args={[0.065, 14, 12]} />
      </mesh>
      <mesh position={[0, -BONE / 2, 0]} material={parts.shell}>
        <capsuleGeometry args={[0.05, BONE - 0.12, 4, 10]} />
      </mesh>
      <group name="knee" position={[0, -BONE, 0]}>
        <mesh material={parts.trim}>
          <sphereGeometry args={[0.048, 12, 10]} />
        </mesh>
        <mesh position={[0, -BONE / 2, 0]} material={parts.trim}>
          <cylinderGeometry args={[0.03, 0.024, BONE, 10]} />
        </mesh>
        <group name="foot" position={[0, -BONE, 0]}>
          <mesh material={parts.trim}>
            <sphereGeometry args={[0.032, 10, 8]} />
          </mesh>
          <mesh geometry={parts.foot} material={parts.amber} position={[0, -SOLE / 2, 0.055]} />
        </group>
      </group>
    </group>
  );

  return (
    <group ref={root} scale={scale}>
      <group ref={hips} position={[0, HIP_Y, 0]}>
        {leg(-1, 0)}
        {leg(1, 1)}

        <group ref={body}>
          <mesh geometry={parts.torso} material={parts.shell} position={[0, 0.2, 0]} />
          <mesh geometry={parts.belly} material={parts.trim} position={[0, 0.01, 0.02]} />
          <mesh geometry={parts.plate} material={parts.trim} position={[0, 0.41, -0.08]} />
          <group ref={tail} position={[0, 0.3, -0.34]}>
            <mesh geometry={parts.tail} material={parts.shell} position={[0, 0.03, -0.07]} rotation={[0.55, 0, 0]} />
          </group>

          {/* Wings hinged along the top of each flank, tipped up toward the
              tail, with a lit seam along the lower edge. */}
          {([-1, 1] as const).map((side, i) => (
            <group
              key={side}
              position={[side * 0.315, 0.32, 0.02]}
              ref={(g) => {
                if (g) wings.current[i] = g;
              }}
            >
              <mesh
                geometry={parts.ball}
                material={parts.shell}
                position={[side * 0.012, -0.1, -0.04]}
                rotation={[-0.2, 0, 0]}
                scale={[0.032, 0.11, 0.24]}
              />
              <mesh
                geometry={parts.ball}
                material={parts.stripe}
                position={[side * 0.04, -0.13, -0.06]}
                rotation={[-0.2, 0, 0]}
                scale={[0.008, 0.018, 0.16]}
              />
            </group>
          ))}

          {/* A twin rocket pod, stowed inside the body until it is wanted. */}
          <group ref={launcher} position={[0, 0.2, -0.1]}>
            <mesh geometry={parts.bracket} material={parts.trim} position={[0, -0.05, -0.02]} />
            {([-1, 1] as const).map((side, i) => (
              <group key={side} position={[side * 0.06, 0, 0]}>
                <mesh material={parts.trim} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.042, 0.042, 0.28, 14]} />
                </mesh>
                <mesh material={parts.ember} position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.045, 0.045, 0.02, 14]} />
                </mesh>
                <group
                  position={[0, 0, 0.16]}
                  ref={(g) => {
                    if (g && muzzles) muzzles.current[i] = g;
                  }}
                />
              </group>
            ))}
          </group>

          {/* Neck, then the head on top of it. */}
          <mesh material={parts.trim} position={[0, 0.48, 0.22]} rotation={[0.25, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.075, 0.2, 12]} />
          </mesh>
          <group ref={head} position={[0, 0.7, 0.26]}>
            <mesh geometry={parts.head} material={parts.shell} />
            <mesh geometry={parts.visor} material={parts.glass} position={[0, 0.03, 0.195]} />
            <group ref={eyes} position={[0, 0.03, 0.222]}>
              {[-1, 1].map((side) => (
                <mesh key={side} material={parts.glow} position={[side * 0.095, 0, 0]} scale={[1, 1.25, 0.45]}>
                  <sphereGeometry args={[0.042, 16, 12]} />
                </mesh>
              ))}
            </group>
            {/* Brows, shrunk to nothing until it is cross. */}
            {[-1, 1].map((side, i) => (
              <mesh
                key={side}
                geometry={parts.brow}
                material={parts.glow}
                position={[side * 0.095, 0.1, 0.222]}
                ref={(m) => {
                  if (m) brows.current[i] = m;
                }}
              />
            ))}
            <mesh geometry={parts.bill} material={parts.amber} position={[0, -0.1, 0.27]} />
            <group ref={jaw} position={[0, -0.125, 0.2]}>
              <mesh geometry={parts.jaw} material={parts.amberDeep} position={[0, 0, 0.055]} />
            </group>
            <group ref={antenna} position={[0.12, 0.17, -0.06]}>
              <mesh material={parts.trim} position={[0, 0.09, 0]}>
                <cylinderGeometry args={[0.011, 0.014, 0.18, 6]} />
              </mesh>
              <mesh position={[0, 0.2, 0]}>
                <sphereGeometry args={[0.034, 12, 10]} />
                <meshStandardMaterial
                  ref={beacon}
                  color={colors.mint}
                  emissive={colors.mint}
                  emissiveIntensity={1}
                />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * Soft light from above, a key from the front, and a violet rim from behind
 * so the outline reads against the card.
 */
export function DroidLights({ colors }: { colors: ThemeColors }) {
  return (
    <>
      <hemisphereLight args={[0xffffff, colors.bg, 1.5]} />
      <directionalLight position={[2.5, 4, 3]} intensity={2.1} />
      <directionalLight position={[-3, 2, -4]} intensity={1.6} color={colors.violet} />
    </>
  );
}
