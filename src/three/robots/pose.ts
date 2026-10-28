import * as THREE from "three";

/**
 * Everything a droid's body does, as plain numbers. A controller writes these
 * each frame; the droid only reads them, so the same model serves the troop
 * running down the timeline and the one living on the contact card.
 */
export type DroidPose = {
  /** Where it is and which way it faces (radians about the vertical). */
  x: number;
  z: number;
  heading: number;
  /** Walk cycle position, radians; one turn is a step with each foot. */
  phase: number;
  /** 0 standing still … 1 a full stride. */
  stride: number;
  /** 0 standing … 1 sat right down, legs folded. */
  crouch: number;
  /** Height of what it stands on: 0 for the ground, more on top of a button. */
  ground: number;
  /** Height off what it stands on, for hops. The legs tuck up with it. */
  lift: number;
  /** Body squashed down (positive) or stretched up (negative), -1 … 1. */
  squash: number;
  /** Head turned left/right and up/down, radians. */
  lookYaw: number;
  lookPitch: number;
  /** 1 eyes open … 0 shut. */
  eyes: number;
  /** 0 wings folded … 1 flapping. */
  flap: number;
  /** 0 bill shut … 1 chattering. */
  talk: number;
  /** 0 calm … 1 cross: brows down, eyes narrowed and red. */
  anger: number;
  /** 0 rocket pod stowed in the body … 1 raised and aimed. */
  launcher: number;
};

export const restingPose = (): DroidPose => ({
  x: 0,
  z: 0,
  heading: 0,
  phase: 0,
  stride: 0,
  crouch: 0,
  ground: 0,
  lift: 0,
  squash: 0,
  lookYaw: 0,
  lookPitch: 0,
  eyes: 1,
  flap: 0,
  talk: 0,
  anger: 0,
  launcher: 0,
});

/**
 * One rocket's flight: a curve from the pod's mouth, out along the line the
 * tube points, to its mark, where it bursts. `at` is the clock
 * time it was fired, or -1 for a slot not in use.
 */
export type Shot = {
  at: number;
  from: THREE.Vector3;
  bend: THREE.Vector3;
  to: THREE.Vector3;
  duration: number;
};

export const idleShot = (): Shot => ({
  at: -1,
  from: new THREE.Vector3(),
  bend: new THREE.Vector3(),
  to: new THREE.Vector3(),
  duration: 1,
});
