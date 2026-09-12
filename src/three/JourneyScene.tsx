import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  CAMERA_START_Z,
  JOURNEY_DEPTH,
  JOURNEY_TRAVEL,
  STATION_GAP,
  STATIONS,
} from "./stations";
import type { JourneyInput } from "@/lib/useJourneyInput";
import type { ThemeColors } from "@/lib/useThemeColors";

type SceneProps = {
  input: RefObject<JourneyInput>;
  colors: ThemeColors;
  quality: "low" | "high";
  /** When true the scene renders one static frame and never animates. */
  still: boolean;
};

/** Shared soft-falloff sprite, built once by the scene root. */
type Glow = { glow: THREE.Texture | null };

const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

/**
 * Seeded PRNG (mulberry32). The particle field is generated during render, so
 * it has to be deterministic — the same seed gives the same corridor on every
 * render, on every reload, for every visitor.
 */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A radial falloff painted once into a canvas. Points and sprites sample it so
 * they read as soft glows instead of hard squares — the single biggest
 * difference between "particles" and "light".
 */
function makeGlow(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.75)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.22)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

/** The four theme tones, in the order the corridor cycles through them. */
const palette = (colors: ThemeColors) => [
  colors.accent,
  colors.cyan,
  colors.violet,
  colors.mint,
];

/* ── Drifting particle shell ────────────────────────────────────────────────
   A hollow cylinder of points the camera flies through. Sized so the corridor
   reads as depth rather than as a wall of dots. Every point takes one of the
   four theme tones, so the field shimmers rather than sitting in one colour. */
function Drift({
  colors,
  quality,
  still,
  glow,
}: Omit<SceneProps, "input"> & Glow) {
  const ref = useRef<THREE.Points>(null);
  const count = quality === "high" ? 3600 : 1300;

  const { positions, tints } = useMemo(() => {
    const random = rng(0x5eed1234);
    const arr = new Float32Array(count * 3);
    const rgb = new Float32Array(count * 3);
    const tones = palette(colors).map((hex) => new THREE.Color(hex));

    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 5.5 + random() * 13;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = Math.sin(angle) * radius * 0.62;
      arr[i * 3 + 2] = 10 - random() * (JOURNEY_DEPTH + 26);

      // Weighted toward the accent so the corridor still has a lead colour.
      const pick = random();
      const tone =
        tones[pick < 0.45 ? 0 : pick < 0.68 ? 1 : pick < 0.87 ? 2 : 3];
      // A little brightness jitter keeps the field from banding.
      const lift = 0.72 + random() * 0.45;
      rgb[i * 3] = tone.r * lift;
      rgb[i * 3 + 1] = tone.g * lift;
      rgb[i * 3 + 2] = tone.b * lift;
    }
    return { positions: arr, tints: rgb };
  }, [count, colors]);

  useFrame((_, dt) => {
    if (still || !ref.current) return;
    ref.current.rotation.z += dt * 0.012;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[tints, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        sizeAttenuation
        vertexColors
        map={glow ?? undefined}
        alphaMap={glow ?? undefined}
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── Signal ribbons ─────────────────────────────────────────────────────────
   Tubes braided down the length of the corridor, one per theme tone. They are
   the spine of the journey: whatever else changes, these keep running forward. */
function Ribbons({
  colors,
  quality,
  still,
}: Pick<SceneProps, "colors" | "quality" | "still">) {
  const group = useRef<THREE.Group>(null);
  const tones = palette(colors);
  const count = quality === "high" ? 5 : 3;
  const segments = quality === "high" ? 220 : 110;

  const geometries = useMemo(() => {
    return Array.from({ length: count }, (_, k) => {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 48; i++) {
        const t = i / 48;
        points.push(
          new THREE.Vector3(
            Math.sin(t * Math.PI * 3 + k * 2.1) * (2.6 + k * 1.1),
            Math.cos(t * Math.PI * 2.2 + k * 1.3) * (1.7 + k * 0.6) - 0.6,
            10 - t * (JOURNEY_DEPTH + 22),
          ),
        );
      }
      const curve = new THREE.CatmullRomCurve3(points);
      return new THREE.TubeGeometry(curve, segments, 0.052, 7, false);
    });
  }, [segments, count]);

  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  // A slow counter-rotation against the particle shell: the braid reads as
  // motion even when the page is not scrolling.
  useFrame((_, dt) => {
    if (still || !group.current) return;
    group.current.rotation.z += dt * 0.018;
  });

  return (
    <group ref={group}>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshBasicMaterial
            color={tones[i % tones.length]}
            transparent
            opacity={0.62}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Nebula ─────────────────────────────────────────────────────────────────
   Broad colour washes hung along the corridor, one tone per station. They do
   almost nothing geometrically and almost everything for how the scene reads:
   without them the corridor is monochrome line-work on a flat background. */
function Nebula({
  colors,
  glow,
  still,
}: Pick<SceneProps, "colors" | "still"> & Glow) {
  const group = useRef<THREE.Group>(null);
  const tones = palette(colors);

  const clouds = useMemo(() => {
    const random = rng(0xc10d5eed);
    return STATIONS.map((station, i) => ({
      id: station.id,
      tone: tones[i % tones.length],
      position: [
        (random() * 2 - 1) * 13,
        (random() * 2 - 1) * 7,
        -i * STATION_GAP - 6,
      ] as [number, number, number],
      scale: 20 + random() * 16,
      phase: random() * Math.PI * 2,
    }));
    // Tones are read through the closure; the station layout itself is static.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  // Gentle breathing so the washes never look like a static gradient overlay.
  useFrame((state) => {
    if (still || !group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const sprite = child as THREE.Sprite;
      const material = sprite.material as THREE.SpriteMaterial;
      material.opacity = 0.16 + Math.sin(t * 0.35 + clouds[i].phase) * 0.06;
    });
  });

  if (!glow) return null;

  return (
    <group ref={group}>
      {clouds.map((cloud) => (
        <sprite
          key={cloud.id}
          position={cloud.position}
          scale={[cloud.scale, cloud.scale, 1]}
        >
          <spriteMaterial
            map={glow}
            color={cloud.tone}
            transparent
            opacity={0.16}
            depthWrite={false}
            // Fog would mix these back toward the background and cancel the
            // whole point of them; distance is already read from the geometry.
            fog={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

/* ── Station gates ──────────────────────────────────────────────────────────
   One ring per page section, lit by proximity. Passing through a ring is the
   moment a new section takes over the screen. Each gate is two rings in
   contrasting tones so the colour shifts as you travel through it. */
function Gates({ colors, still }: Pick<SceneProps, "colors" | "still">) {
  const group = useRef<THREE.Group>(null);
  const materials = useRef<THREE.MeshBasicMaterial[]>([]);
  const tones = palette(colors);

  const toneFor = (tone: string) =>
    tone === "violet"
      ? colors.violet
      : tone === "cyan"
        ? colors.cyan
        : tone === "mint"
          ? colors.mint
          : colors.accent;

  useFrame((state, dt) => {
    const camZ = state.camera.position.z;
    materials.current.forEach((material, i) => {
      if (!material) return;
      const distance = Math.abs(camZ - -Math.floor(i / 2) * STATION_GAP);
      // Bright at the ring, fading out well before it reaches the fog.
      const target = THREE.MathUtils.clamp(1 - distance / 26, 0.06, 1);
      // Odd indices are the inner ring; it sits a touch behind the outer one.
      const peak = i % 2 === 0 ? target : target * 0.7;
      material.opacity = still ? peak : damp(material.opacity, peak, 4, dt);
    });
    if (!still && group.current) group.current.rotation.z -= dt * 0.03;
  });

  return (
    <group ref={group}>
      {STATIONS.map((station, i) => (
        <group
          key={station.id}
          position={[0, 0, -i * STATION_GAP]}
          rotation={[0, 0, (i * Math.PI) / 7]}
        >
          <mesh>
            <torusGeometry args={[6.4, 0.06, 6, 96]} />
            <meshBasicMaterial
              ref={(m: THREE.MeshBasicMaterial | null) => {
                if (m) materials.current[i * 2] = m;
              }}
              color={toneFor(station.tone)}
              transparent
              opacity={0.2}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh rotation={[0, 0, 0.4]}>
            <torusGeometry args={[5.1, 0.035, 6, 80]} />
            <meshBasicMaterial
              ref={(m: THREE.MeshBasicMaterial | null) => {
                if (m) materials.current[i * 2 + 1] = m;
              }}
              color={tones[(i + 2) % tones.length]}
              transparent
              opacity={0.15}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── The core ───────────────────────────────────────────────────────────────
   Sits at the mouth of the corridor behind the hero, then falls away as the
   journey starts. */
function Core({ colors }: Pick<SceneProps, "colors">) {
  const group = useRef<THREE.Group>(null);
  const width = useThree((state) => state.size.width);
  // Narrow viewports put the copy across the full width, so the core moves up
  // and back rather than sitting behind the paragraph.
  const compact = width < 900;
  const position: [number, number, number] = compact
    ? [0.8, 5, -15]
    : [3.4, 0.6, -7.5];
  const baseScale = compact ? 0.75 : 1;

  useFrame((state, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 0.16;
    group.current.rotation.x += dt * 0.05;
    // Shrink out of the way once the camera has left the first station.
    const travelled = THREE.MathUtils.clamp(
      (CAMERA_START_Z - state.camera.position.z) / 20,
      0,
      1,
    );
    group.current.scale.setScalar(baseScale * (1 - travelled * 0.55));
  });

  return (
    <group ref={group} position={position}>
      <mesh>
        <icosahedronGeometry args={[3, 1]} />
        <meshBasicMaterial
          color={colors.cyan}
          wireframe
          transparent
          opacity={0.62}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={1.22}>
        <icosahedronGeometry args={[3, 0]} />
        <meshBasicMaterial
          color={colors.violet}
          wireframe
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.7, 0]} />
        <meshStandardMaterial
          color={colors.violet}
          emissive={colors.accent}
          emissiveIntensity={0.9}
          flatShading
          roughness={0.35}
          metalness={0.15}
          transparent
          opacity={0.45}
        />
      </mesh>
    </group>
  );
}

/* ── Floor ──────────────────────────────────────────────────────────────────
   A ground plane is what makes forward motion legible; without it the corridor
   reads as drifting rather than travelling. */
function Floor({ colors }: Pick<SceneProps, "colors">) {
  const grid = useMemo(() => {
    const helper = new THREE.GridHelper(300, 96, colors.cyan, colors.violet);
    const material = helper.material as THREE.Material;
    material.transparent = true;
    material.opacity = 0.2;
    material.depthWrite = false;
    return helper;
  }, [colors.cyan, colors.violet]);

  useEffect(() => () => grid.dispose(), [grid]);

  return <primitive object={grid} position={[0, -7.5, -JOURNEY_DEPTH / 2]} />;
}

/* ── Camera rig ─────────────────────────────────────────────────────────────
   Scroll drives depth; the pointer adds a small parallax lean. The camera
   never looks anywhere but forward, so the corridor stays readable. */
function Rig({ input, still }: Pick<SceneProps, "input" | "still">) {
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const { progress, px, py } = input.current;
    const camera = state.camera;

    // Reduced motion: hold a fixed view of the corridor mouth. The scene is
    // still there to look at, it just never moves.
    if (still) {
      camera.position.set(0, 0.2, CAMERA_START_Z);
      camera.rotation.set(0, 0, 0);
      return;
    }

    const targetZ = CAMERA_START_Z - progress * JOURNEY_TRAVEL;

    camera.position.z = damp(camera.position.z, targetZ, 3.2, dt);
    camera.position.x = damp(camera.position.x, px * 1.1, 1.8, dt);
    camera.position.y = damp(camera.position.y, 0.2 - py * 0.7, 1.8, dt);
    camera.rotation.y = damp(camera.rotation.y, -px * 0.05, 1.8, dt);
    camera.rotation.x = damp(camera.rotation.x, py * 0.03, 1.8, dt);
    camera.rotation.z = damp(camera.rotation.z, px * 0.02, 1.8, dt);
  });

  return null;
}

export function JourneyScene({ input, colors, quality, still }: SceneProps) {
  const glow = useMemo(makeGlow, []);
  useEffect(() => () => glow?.dispose(), [glow]);

  return (
    <>
      {/* Pushed back from the original 14 so the colour washes survive the haze. */}
      <fog attach="fog" args={[colors.bg, 20, 62]} />
      <ambientLight intensity={0.7} />
      <pointLight position={[6, 6, 4]} intensity={45} color={colors.cyan} />
      <pointLight
        position={[-7, -3, -6]}
        intensity={40}
        color={colors.violet}
      />
      <pointLight position={[0, 4, -22]} intensity={35} color={colors.mint} />
      <Rig input={input} still={still} />
      <Nebula colors={colors} glow={glow} still={still} />
      <Drift colors={colors} quality={quality} still={still} glow={glow} />
      <Ribbons colors={colors} quality={quality} still={still} />
      <Gates colors={colors} still={still} />
      {/* The core spins; with motion reduced the corridor stands on its own. */}
      {!still && <Core colors={colors} />}
      <Floor colors={colors} />
    </>
  );
}
