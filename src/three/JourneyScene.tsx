import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { STATIONS } from "./stations";
import { buildFormations, rng } from "./formations";
import {
  CONSTELLATION_FRAGMENT,
  CONSTELLATION_VERTEX,
  NEBULA_FRAGMENT,
  SCREEN_FRAGMENT,
  SCREEN_VERTEX,
  STAR_FRAGMENT,
  STAR_VERTEX,
} from "./shaders";
import type { JourneyInput } from "@/lib/useJourneyInput";
import type { ThemeColors } from "@/lib/useThemeColors";

type SceneProps = {
  input: RefObject<JourneyInput>;
  colors: ThemeColors;
  quality: "low" | "high";
  /** When true the scene renders one static frame and never animates. */
  still: boolean;
  /** Raised once every shader is compiled and the scene is ready to draw. */
  onWarm: () => void;
};

/**
 * Smoothed state every layer reads from. Raw scroll arrives in steps — a wheel
 * notch, a touch fling — so nothing in the scene follows it directly; it all
 * follows this, which eases toward the input a little every frame.
 */
type Flight = {
  station: number;
  /** Scroll speed in viewport heights per second, signed. */
  velocity: number;
  /** How far the star field has flown. Wraps at STAR_DEPTH. */
  travel: number;
  /** 0 while the stars are still scattered, 1 once the first figure has formed. */
  intro: number;
  lastY: number | null;
  /** Where the constellation sits on screen, in 0…1. The nebula glows behind it. */
  focusX: number;
  focusY: number;
};

type Layer = Omit<SceneProps, "input" | "onWarm"> & { flightRef: RefObject<Flight> };

const CAMERA_Z = 7;
/** The constellation hangs this far in front of the camera. */
const FIGURE_Z = -3;
const STAR_DEPTH = 64;
const INTRO_SECONDS = 2.8;
/** Share of a section the figure holds still for before it starts to regroup. */
const HOLD = 0.42;
const LAST = STATIONS.length - 1;

const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Which pair of stations the journey is between, and how far across. */
function leg(station: number) {
  const s = THREE.MathUtils.clamp(station, 0, LAST);
  const from = Math.min(Math.floor(s), LAST - 1);
  return { from, mix: THREE.MathUtils.smoothstep(s - from, HOLD, 1) };
}

/** Additive light vanishes on a pale page, so the light theme draws in ink. */
function usePalette(colors: ThemeColors) {
  return useMemo(() => {
    const bg = new THREE.Color(colors.bg);
    const light = bg.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
    const tone = {
      accent: new THREE.Color(colors.accent),
      violet: new THREE.Color(colors.violet),
      cyan: new THREE.Color(colors.cyan),
      mint: new THREE.Color(colors.mint),
    };
    return {
      light,
      tone,
      stations: STATIONS.map((station) => tone[station.tone]),
      star: new THREE.Color(light ? colors.accent : colors.text),
      blending: light ? THREE.NormalBlending : THREE.AdditiveBlending,
    };
  }, [colors]);
}

/** Pixels one world unit covers at one unit of distance — sizes points in world space. */
const pixelsPerUnit = (state: RootState) =>
  (state.size.height * state.viewport.dpr) /
  (2 * Math.tan(THREE.MathUtils.degToRad((state.camera as THREE.PerspectiveCamera).fov) / 2));

/* ── Pilot ──────────────────────────────────────────────────────────────────
   Turns scroll and pointer into the flight state, and leans the camera a
   little toward the pointer. Mounted first so every layer below reads this
   frame's values rather than last frame's. */
function Pilot({ input, flightRef, still }: Pick<SceneProps, "input" | "still"> & { flightRef: RefObject<Flight> }) {
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const f = flightRef.current;
    const { y, station, px, py } = input.current;
    const camera = state.camera;

    // Reduced motion: one fixed view of the first figure, already formed.
    if (still) {
      f.station = 0;
      f.velocity = 0;
      f.intro = 1;
      camera.position.set(0, 0.2, CAMERA_Z);
      camera.rotation.set(0, 0, 0);
      return;
    }

    if (f.lastY === null) f.station = station;
    const speed = f.lastY === null ? 0 : (y - f.lastY) / dt;
    f.lastY = y;

    f.velocity = damp(f.velocity, THREE.MathUtils.clamp(speed, -5, 5), 5, dt);
    f.station = damp(f.station, station, 3.2, dt);
    f.travel = (f.travel + dt * (0.45 + f.velocity * 7)) % STAR_DEPTH;
    f.intro = Math.min(1, f.intro + dt / INTRO_SECONDS);

    camera.position.x = damp(camera.position.x, px * 0.5, 1.6, dt);
    camera.position.y = damp(camera.position.y, 0.2 - py * 0.35, 1.6, dt);
    camera.rotation.y = damp(camera.rotation.y, -px * 0.025, 1.6, dt);
    camera.rotation.x = damp(camera.rotation.x, py * 0.018, 1.6, dt);
  });

  return null;
}

/* ── Nebula ─────────────────────────────────────────────────────────────────
   Domain-warped noise, which is what gives gas its folded, drifting look. It
   is also the most expensive thing here per pixel, and it has no fine detail,
   so it is drawn into a small off-screen buffer and stretched over the view. */
const NEBULA_ROWS = 216;

type Buffer = {
  target: THREE.WebGLRenderTarget;
  scene: THREE.Scene;
  camera: THREE.Camera;
  material: THREE.ShaderMaterial;
  dispose: () => void;
};

function createBuffer(): Buffer {
  const material = new THREE.ShaderMaterial({
    vertexShader: SCREEN_VERTEX,
    fragmentShader: NEBULA_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uShift: { value: new THREE.Vector2() },
      uFocus: { value: new THREE.Vector2(0.5, 0.5) },
      uDeep: { value: new THREE.Color() },
      uTone: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
      uHot: { value: new THREE.Color() },
    },
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const target = new THREE.WebGLRenderTarget(NEBULA_ROWS, NEBULA_ROWS, { depthBuffer: false });

  return {
    target,
    scene,
    camera: new THREE.Camera(),
    material,
    dispose: () => {
      target.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}

function Nebula({ colors, still, flightRef, buffer }: Layer & { buffer: RefObject<Buffer | null> }) {
  const screen = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);
  const palette = usePalette(colors);

  const uniforms = useMemo(
    () => ({ uMap: { value: null as THREE.Texture | null }, uOpacity: { value: 0 } }),
    [],
  );

  // Built by whichever needs it first, the warm-up or the first frame, so that
  // a scene which only ever renders one still frame has it in time. Torn down
  // with the layer.
  useEffect(
    () => () => {
      buffer.current?.dispose();
      buffer.current = null;
    },
    [buffer],
  );

  useFrame((state) => {
    const mesh = screen.current;
    if (!mesh) return;
    const b = (buffer.current ??= createBuffer());

    const f = flightRef.current;
    const aspect = state.size.width / state.size.height;
    const columns = Math.min(Math.round(NEBULA_ROWS * aspect), 640);
    if (b.target.width !== columns) b.target.setSize(columns, NEBULA_ROWS);

    const { from, mix } = leg(f.station);
    const u = b.material.uniforms;
    u.uTime.value = still ? 0 : state.clock.elapsedTime;
    u.uAspect.value = aspect;
    // The gas slides past more slowly than the stars: it is further away.
    u.uShift.value.set(state.camera.position.x * 0.04, -f.station * 0.22);
    u.uFocus.value.set(f.focusX, f.focusY);
    u.uTone.value.copy(palette.stations[from]).lerp(palette.stations[from + 1], mix);
    u.uDeep.value.copy(palette.tone.accent).multiplyScalar(palette.light ? 0.9 : 0.32);
    u.uGlow.value.copy(palette.tone.cyan);
    u.uHot.value.copy(palette.tone.violet);

    state.gl.setRenderTarget(b.target);
    state.gl.render(b.scene, b.camera);
    state.gl.setRenderTarget(null);

    mesh.material.uniforms.uMap.value = b.target.texture;
    mesh.material.uniforms.uOpacity.value = (palette.light ? 0.3 : 0.62) * (0.35 + 0.65 * f.intro);
  });

  return (
    <mesh ref={screen} frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={SCREEN_VERTEX}
        fragmentShader={SCREEN_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Star field ─────────────────────────────────────────────────────────────
   Distant stars the page flies through. They never run out: each one wraps
   back to the far end once it passes the camera. Scroll speed stretches them
   into streaks, so a fast scroll reads as a jump between stations. */
function Stars({ colors, quality, still, flightRef }: Layer) {
  const points = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const streaks = useRef<THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const palette = usePalette(colors);
  const count = quality === "high" ? 1500 : 700;

  const { heads, tails } = useMemo(() => {
    const random = rng(0x57a125);
    const position = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      // Kept off the axis: a star passing straight through the lens is a flash.
      const angle = random() * Math.PI * 2;
      const radius = 2.5 + Math.sqrt(random()) * 27;
      position[i * 3] = Math.cos(angle) * radius;
      position[i * 3 + 1] = Math.sin(angle) * radius * 0.6;
      position[i * 3 + 2] = -random() * STAR_DEPTH;
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = random();
    }

    // A streak is the same star twice: one end stays put, the other trails.
    const pairPosition = new Float32Array(count * 6);
    const pairSeed = new Float32Array(count * 8);
    const end = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      pairPosition.set(position.subarray(i * 3, i * 3 + 3), i * 6);
      pairPosition.set(position.subarray(i * 3, i * 3 + 3), i * 6 + 3);
      pairSeed.set(seed.subarray(i * 4, i * 4 + 4), i * 8);
      pairSeed.set(seed.subarray(i * 4, i * 4 + 4), i * 8 + 4);
      end[i * 2 + 1] = 1;
    }
    return {
      heads: { position, seed },
      tails: { position: pairPosition, seed: pairSeed, end },
    };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uStretch: { value: 0 },
      uDepth: { value: STAR_DEPTH },
      uNear: { value: CAMERA_Z - 1 },
      uPixels: { value: 1 },
      uOpacity: { value: 0 },
      uStar: { value: new THREE.Color() },
      uTint: { value: new THREE.Color() },
    }),
    [],
  );

  useFrame((state) => {
    const f = flightRef.current;
    const { from, mix } = leg(f.station);
    for (const object of [points.current, streaks.current]) {
      if (!object) continue;
      const u = object.material.uniforms;
      u.uTime.value = still ? 0 : state.clock.elapsedTime;
      u.uTravel.value = f.travel;
      u.uStretch.value = f.velocity * 1.5;
      u.uPixels.value = pixelsPerUnit(state);
      u.uOpacity.value = (palette.light ? 0.5 : 1) * f.intro;
      u.uStar.value.copy(palette.star);
      u.uTint.value.copy(palette.stations[from]).lerp(palette.stations[from + 1], mix);
    }
  });

  return (
    <>
      <points ref={points} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[heads.position, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[heads.seed, 4]} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={STAR_VERTEX}
          fragmentShader={STAR_FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={palette.blending}
        />
      </points>
      {!still && (
        <lineSegments ref={streaks} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[tails.position, 3]} />
            <bufferAttribute attach="attributes-aSeed" args={[tails.seed, 4]} />
            <bufferAttribute attach="attributes-aEnd" args={[tails.end, 1]} />
          </bufferGeometry>
          <shaderMaterial
            vertexShader={STAR_VERTEX}
            fragmentShader={STAR_FRAGMENT}
            uniforms={uniforms}
            defines={{ STREAK: "" }}
            transparent
            depthWrite={false}
            blending={palette.blending}
          />
        </lineSegments>
      )}
    </>
  );
}

/* ── Constellation ──────────────────────────────────────────────────────────
   The centrepiece: one set of stars that gathers into a different figure for
   every section. Only two figures are ever bound — the one being left and the
   one being approached — and the vertex shader blends between them, so the
   regrouping costs the CPU nothing however many stars there are. */

/**
 * Where the figure hangs, as a share of the half-view: [across, up]. The upper
 * right is the one part of the screen every section leaves clear — headings
 * run left, cards start lower — so the figure is never fighting the copy.
 * Alternate stations sit a touch apart so a regrouping also travels.
 */
const ANCHORS: [number, number][] = [
  [0.56, 0.5],
  [0.5, 0.46],
];

/**
 * The same on a screen taller than it is wide. There the copy runs the full
 * width and no part of the screen is left clear, so the figure cannot keep out
 * of the way; it steps back instead. It comes in from the edge, where it would
 * be cut off, to sit beside the name in the hero, and is drawn smaller and
 * fainter so that whatever text passes over it still reads.
 */
const TALL_ANCHORS: [number, number][] = [
  [0.5, 0.4],
  [0.42, 0.36],
];
/** Smallest the figure is allowed to get on a tall screen. */
const TALL_SCALE = 0.38;
/** How much of its brightness the figure keeps on a tall screen. */
const TALL_FADE = 0.55;

function Constellation({ colors, quality, still, flightRef }: Layer) {
  const points = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const bound = useRef(-1);
  const palette = usePalette(colors);
  const count = quality === "high" ? 7200 : 3400;

  const figures = useMemo(
    () => buildFormations(count).map((array) => new THREE.BufferAttribute(array, 3)),
    [count],
  );

  const geometry = useMemo(() => {
    const random = rng(0x5eed1234);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < seed.length; i++) seed[i] = random();
    const g = new THREE.BufferGeometry();
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    return g;
  }, [count]);

  useEffect(() => {
    bound.current = -1;
    return () => geometry.dispose();
  }, [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMix: { value: 0 },
      uIntro: { value: 0 },
      uWarp: { value: 0 },
      uPixels: { value: 1 },
      uLight: { value: 0 },
      uFade: { value: 1 },
      uTone: { value: new THREE.Color() },
      uAlt: { value: new THREE.Color() },
      uCore: { value: new THREE.Color() },
    }),
    [],
  );

  const anchorRef = useRef<THREE.Vector3 | null>(null);

  useFrame((state) => {
    const object = points.current;
    if (!object) return;

    const f = flightRef.current;
    const { from, mix } = leg(f.station);
    const t = still ? 0 : state.clock.elapsedTime;

    if (bound.current !== from) {
      bound.current = from;
      object.geometry.setAttribute("position", figures[from]);
      object.geometry.setAttribute("aTo", figures[from + 1]);
    }

    // The view at the figure's distance, so layout is in screen terms and the
    // figure shrinks to fit a narrow window instead of running off its edge.
    const distance = CAMERA_Z - FIGURE_Z;
    const halfHeight = distance * Math.tan(THREE.MathUtils.degToRad(31));
    const aspect = state.size.width / state.size.height;
    const halfWidth = halfHeight * aspect;
    // 0 on a wide screen, 1 on a tall one, easing across between the two so a
    // window dragged narrower never sees the figure jump.
    const tall = 1 - THREE.MathUtils.smoothstep(aspect, 0.7, 1.15);
    const ax = THREE.MathUtils.lerp(ANCHORS[from % 2][0], TALL_ANCHORS[from % 2][0], tall);
    const ay = THREE.MathUtils.lerp(ANCHORS[from % 2][1], TALL_ANCHORS[from % 2][1], tall);
    const bx = THREE.MathUtils.lerp(ANCHORS[(from + 1) % 2][0], TALL_ANCHORS[(from + 1) % 2][0], tall);
    const by = THREE.MathUtils.lerp(ANCHORS[(from + 1) % 2][1], TALL_ANCHORS[(from + 1) % 2][1], tall);
    object.position.set(
      THREE.MathUtils.lerp(ax, bx, mix) * halfWidth,
      THREE.MathUtils.lerp(ay, by, mix) * halfHeight,
      FIGURE_Z,
    );
    object.scale.setScalar(
      THREE.MathUtils.clamp(halfWidth / 15.5, THREE.MathUtils.lerp(0.46, TALL_SCALE, tall), 0.74),
    );

    // A slow sway plus a lean toward the pointer: enough to show the figure
    // has depth without ever turning it far enough to stop reading.
    const lean = state.camera.position.x / 0.5;
    object.rotation.y = Math.sin(t * 0.21) * 0.2 + lean * 0.22;
    object.rotation.x = Math.sin(t * 0.16) * 0.06 - (state.camera.position.y - 0.2) * 0.3;

    const anchor = (anchorRef.current ??= new THREE.Vector3());
    anchor.copy(object.position).project(state.camera);
    f.focusX = anchor.x * 0.5 + 0.5;
    f.focusY = anchor.y * 0.5 + 0.5;

    const u = object.material.uniforms;
    u.uTime.value = t;
    u.uMix.value = mix;
    u.uIntro.value = f.intro;
    u.uWarp.value = Math.min(Math.abs(f.velocity) / 3, 1);
    u.uPixels.value = pixelsPerUnit(state);
    u.uLight.value = palette.light ? 1 : 0;
    u.uFade.value = THREE.MathUtils.lerp(1, TALL_FADE, tall);
    u.uTone.value.copy(palette.stations[from]).lerp(palette.stations[from + 1], mix);
    u.uAlt.value.copy(from % 2 ? palette.tone.cyan : palette.tone.violet);
    u.uCore.value.copy(palette.star);
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={CONSTELLATION_VERTEX}
        fragmentShader={CONSTELLATION_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={palette.blending}
      />
    </points>
  );
}

/* ── Warm-up ────────────────────────────────────────────────────────────────
   Compiles every shader before the first frame is asked for. Left to the first
   frame, compilation is synchronous: the nebula alone holds the GPU for most of
   a second, and for that second nothing on the page can be drawn, the loader
   included. Asked for ahead of time it happens on the driver's own threads and
   the page keeps moving. The canvas holds its frame loop until this reports. */
function Warmup({ buffer, onWarm }: { buffer: RefObject<Buffer | null>; onWarm: () => void }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    let cancelled = false;
    const b = (buffer.current ??= createBuffer());

    // A program is keyed by where it will be drawn, so the nebula has to be
    // compiled against its own off-screen target or it compiles twice.
    gl.setRenderTarget(b.target);
    const nebula = gl.compileAsync(b.scene, b.camera);
    gl.setRenderTarget(null);

    Promise.all([nebula, gl.compileAsync(scene, camera)])
      // A failed warm-up costs nothing but the stall it was there to avoid.
      .catch(() => {})
      .then(() => {
        if (!cancelled) onWarm();
      });

    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, buffer, onWarm]);

  return null;
}

export function JourneyScene({ input, colors, quality, still, onWarm }: SceneProps) {
  const nebulaBuffer = useRef<Buffer | null>(null);
  const flightRef = useRef<Flight>({
    station: 0,
    velocity: 0,
    travel: 0,
    intro: still ? 1 : 0,
    lastY: null,
    focusX: 0.5,
    focusY: 0.5,
  });

  return (
    <>
      <Pilot input={input} flightRef={flightRef} still={still} />
      <Nebula
        colors={colors}
        quality={quality}
        still={still}
        flightRef={flightRef}
        buffer={nebulaBuffer}
      />
      <Stars colors={colors} quality={quality} still={still} flightRef={flightRef} />
      <Constellation colors={colors} quality={quality} still={still} flightRef={flightRef} />
      <Warmup buffer={nebulaBuffer} onWarm={onWarm} />
    </>
  );
}
