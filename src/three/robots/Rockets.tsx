import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ThemeColors } from "@/lib/useThemeColors";
import type { Shot } from "./pose";

/**
 * How many rockets can be in the air at once: a volley of three, one for each
 * button on the card, fired from the pod's two tubes in turn.
 */
export const ROCKET_SLOTS = 3;

const ROCKET_SIZE = 0.75;
const PUFFS = 56;
const SPARKS = 28;
/** Time between smoke puffs left behind a rocket in flight. */
const PUFF_EVERY = 0.018;
/** Scale for anything not in use: still drawn, so its shader compiles up front. */
const HIDDEN = 1e-4;

/** A point along the flight's quadratic Bézier curve. */
function along(shot: Shot, u: number, out: THREE.Vector3) {
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  const c = u * u;
  return out
    .copy(shot.from)
    .multiplyScalar(a)
    .addScaledVector(shot.bend, b)
    .addScaledVector(shot.to, c);
}

type Particle = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  born: number;
  life: number;
  size: number;
  velocity: THREE.Vector3;
};

/**
 * Everything the rockets need, made once: the rockets themselves, a pool of
 * smoke puffs, a pool of sparks and a flash per rocket, and the frame update
 * that moves them. Nothing is created while one is in the air.
 */
function makeShow(colors: ThemeColors) {
  const bg = new THREE.Color(colors.bg);
  const text = new THREE.Color(colors.text);
  const light = bg.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
  const amber = new THREE.Color(colors.amber);
  const danger = new THREE.Color(colors.danger);
  const smoke = light ? text.clone().lerp(bg, 0.72) : text.clone().lerp(bg, 0.45);

  const root = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(thing: T) => (disposables.push(thing), thing);

  const ball = keep(new THREE.SphereGeometry(1, 14, 10));
  const casing = keep(new THREE.MeshStandardMaterial({ color: text.clone().lerp(bg, 0.15), roughness: 0.4, metalness: 0.3 }));
  const nose = keep(new THREE.MeshStandardMaterial({ color: danger, roughness: 0.45 }));
  const fin = keep(new THREE.MeshStandardMaterial({ color: bg.clone().lerp(text, light ? 0.6 : 0.3), roughness: 0.6 }));
  const flameOuter = keep(
    new THREE.MeshBasicMaterial({ color: amber, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  const flameInner = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false }));

  // A rocket points along +z, so lookAt aims it down its path.
  const body = keep(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 12).rotateX(Math.PI / 2));
  const cone = keep(new THREE.ConeGeometry(0.04, 0.1, 12).rotateX(Math.PI / 2));
  const vane = keep(new THREE.BoxGeometry(0.012, 0.07, 0.07));
  const flame = keep(new THREE.ConeGeometry(0.035, 0.2, 10).rotateX(-Math.PI / 2));

  const rockets = Array.from({ length: ROCKET_SLOTS }, () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(body, casing));
    const tip = new THREE.Mesh(cone, nose);
    tip.position.z = 0.17;
    group.add(tip);
    for (let i = 0; i < 3; i++) {
      const v = new THREE.Mesh(vane, fin);
      const a = (i / 3) * Math.PI * 2;
      v.position.set(Math.sin(a) * 0.045, Math.cos(a) * 0.045, -0.1);
      v.rotation.z = -a;
      group.add(v);
    }
    const outer = new THREE.Mesh(flame, flameOuter);
    outer.position.z = -0.22;
    const inner = new THREE.Mesh(flame, flameInner);
    inner.position.z = -0.17;
    inner.scale.setScalar(0.5);
    group.add(outer, inner);
    group.scale.setScalar(HIDDEN);
    root.add(group);
    return { group, outer };
  });

  const particle = (color: THREE.Color, additive: boolean): Particle => {
    const material = keep(
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    );
    const mesh = new THREE.Mesh(ball, material);
    mesh.scale.setScalar(HIDDEN);
    root.add(mesh);
    return { mesh, material, born: -1, life: 1, size: 0, velocity: new THREE.Vector3() };
  };

  const puffs = Array.from({ length: PUFFS }, () => particle(smoke, false));
  const sparks = Array.from({ length: SPARKS }, () => particle(amber, true));
  const flashes = Array.from({ length: ROCKET_SLOTS }, () => ({
    fire: particle(amber, true),
    core: particle(new THREE.Color(0xffffff), true),
  }));

  const seen: number[] = [];
  const burst: number[] = [];
  const nextPuff: number[] = [];
  const at = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const back = new THREE.Vector3();
  let puffIndex = 0;
  let sparkIndex = 0;
  let shake = -1;

  const spawn = (pool: Particle[], index: number, t: number, where: THREE.Vector3, life: number, size: number) => {
    const p = pool[index % pool.length];
    p.born = t;
    p.life = life;
    p.size = size;
    p.mesh.position.copy(where);
    return p;
  };

  /** Hits its mark: a flash, a white-hot core, sparks and smoke. */
  const explode = (slot: number, where: THREE.Vector3, t: number) => {
    shake = t;
    const flash = flashes[slot];
    for (const p of [flash.fire, flash.core]) {
      p.born = t;
      p.mesh.position.copy(where);
    }
    flash.fire.life = 0.5;
    flash.core.life = 0.22;
    for (let s = 0; s < 14; s++) {
      const spark = spawn(sparks, sparkIndex++, t, where, 0.45 + Math.random() * 0.35, 0.018 + Math.random() * 0.016);
      const a = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2;
      spark.velocity.set(Math.cos(a) * speed, Math.abs(Math.sin(a)) * speed + 0.8, (Math.random() - 0.5) * 0.6);
    }
    for (let s = 0; s < 9; s++) {
      const puff = spawn(puffs, puffIndex++, t, where, 0.9 + Math.random() * 0.5, 0.07 + Math.random() * 0.06);
      puff.mesh.position.x += (Math.random() - 0.5) * 0.25;
      puff.mesh.position.y += (Math.random() - 0.5) * 0.2;
      puff.velocity.set((Math.random() - 0.5) * 0.4, 0.25 + Math.random() * 0.3, 0);
    }
  };

  const update = (shots: Shot[], t: number, dt: number, camera: THREE.Camera, rest: THREE.Vector3) => {
    shots.forEach((shot, i) => {
      const rocket = rockets[i];
      if (shot.at < 0) return;
      if (seen[i] !== shot.at) {
        seen[i] = shot.at;
        nextPuff[i] = shot.at;
      }
      const tau = t - shot.at;

      if (tau < shot.duration) {
        // It speeds up as it goes, as a rocket does.
        const u = Math.pow(tau / shot.duration, 1.6);
        along(shot, u, at);
        along(shot, Math.min(u + 0.02, 1), ahead);
        rocket.group.position.copy(at);
        rocket.group.lookAt(ahead);
        rocket.group.scale.setScalar(ROCKET_SIZE);
        rocket.outer.scale.set(1, 1, 0.7 + Math.random() * 0.7);

        // A trail of smoke from the tail.
        back.subVectors(at, ahead).normalize();
        while (nextPuff[i] <= t) {
          nextPuff[i] += PUFF_EVERY;
          const puff = spawn(puffs, puffIndex++, t, at, 0.55 + Math.random() * 0.35, 0.035 + Math.random() * 0.03);
          puff.mesh.position.addScaledVector(back, 0.2 * ROCKET_SIZE);
          puff.velocity.set((Math.random() - 0.5) * 0.15, 0.2 + Math.random() * 0.15, 0);
        }
        return;
      }

      rocket.group.scale.setScalar(HIDDEN);
      if (burst[i] !== shot.at) {
        burst[i] = shot.at;
        explode(i, shot.to, t);
      }
    });

    // Smoke grows, drifts up and thins away.
    for (const p of puffs) {
      const age = (t - p.born) / p.life;
      if (p.born < 0 || age >= 1) {
        p.mesh.scale.setScalar(HIDDEN);
        continue;
      }
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.scale.setScalar(p.size * (1 + 2.6 * age));
      p.material.opacity = 0.5 * Math.pow(1 - age, 1.5);
    }

    // Sparks fall, skip once off the ground, and shrink to nothing.
    for (const p of sparks) {
      const age = (t - p.born) / p.life;
      if (p.born < 0 || age >= 1) {
        p.mesh.scale.setScalar(HIDDEN);
        continue;
      }
      p.velocity.y -= 7 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      if (p.mesh.position.y < 0.02) {
        p.mesh.position.y = 0.02;
        p.velocity.y = Math.abs(p.velocity.y) * 0.35;
        p.velocity.x *= 0.6;
      }
      p.mesh.scale.setScalar(p.size * (1 - age));
      p.material.opacity = 1 - age * age;
    }

    // The flash swells fast and fades from amber to red.
    for (const { fire, core } of flashes) {
      const age = (t - fire.born) / fire.life;
      if (fire.born < 0 || age >= 1) {
        fire.mesh.scale.setScalar(HIDDEN);
        core.mesh.scale.setScalar(HIDDEN);
        continue;
      }
      fire.mesh.scale.setScalar(0.12 + 0.42 * (1 - Math.pow(1 - Math.min(age * 2, 1), 3)));
      fire.material.color.lerpColors(amber, danger, age);
      fire.material.opacity = 1 - age;
      const coreAge = Math.min((t - core.born) / core.life, 1);
      core.mesh.scale.setScalar(coreAge < 1 ? 0.18 * (1 - coreAge) : HIDDEN);
      core.material.opacity = 1 - coreAge;
    }

    // A short, fading shake for each burst.
    const shaking = t - shake;
    if (shake >= 0 && shaking < 0.35) {
      const amp = 0.05 * (1 - shaking / 0.35);
      camera.position.set(rest.x + (Math.random() - 0.5) * 2 * amp, rest.y + (Math.random() - 0.5) * 2 * amp, rest.z);
    } else if (shake >= 0) {
      camera.position.copy(rest);
      shake = -1;
    }
  };

  return { root, update, dispose: () => disposables.forEach((d) => d.dispose()) };
}

/**
 * The contact droid's rockets in flight, their smoke, and the bursts where
 * they hit the buttons on the card, with a little camera shake for each.
 */
export function Rockets({
  shots,
  colors,
  camera: rest,
}: {
  shots: RefObject<Shot[]>;
  colors: ThemeColors;
  /** Where the camera sits when it is not shaking. */
  camera: THREE.Vector3;
}) {
  const camera = useThree((state) => state.camera);
  const holder = useRef<THREE.Group>(null);
  const show = useRef<ReturnType<typeof makeShow> | null>(null);

  // Built in an effect rather than during render, since it changes itself
  // every frame. Effects run before CompileFirst's, so it is in the scene in
  // time for its shaders to compile along with the droid's.
  useEffect(() => {
    const group = holder.current;
    const made = makeShow(colors);
    group?.add(made.root);
    show.current = made;
    return () => {
      group?.remove(made.root);
      show.current = null;
      made.dispose();
    };
  }, [colors]);

  useFrame((state, delta) => {
    show.current?.update(shots.current, state.clock.elapsedTime, Math.min(delta, 0.05), camera, rest);
  });

  return <group ref={holder} />;
}
