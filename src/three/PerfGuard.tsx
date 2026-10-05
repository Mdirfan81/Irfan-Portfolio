import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

type Props = {
  /** Called once when the scene cannot hold a usable frame rate. */
  onGiveUp: () => void;
  /** Called with a reduced pixel ratio before giving up entirely. */
  onDowngrade: () => void;
  downgraded: boolean;
};

const SAMPLE = 45; // frames per verdict
const SLOW_MS = 34; // ~29fps
const HOPELESS_MS = 60; // ~16fps
// A single frame this long is a stall — a tab switch, a GC pause, a scroll
// jank spike — not a device that cannot render. Measuring it would condemn a
// perfectly capable machine, so it is dropped from the sample entirely.
const STALL_MS = 90;
// Consecutive hopeless verdicts required before the scene is handed back.
const STRIKES = 3;

/**
 * Watches real frame times and backs the scene off when the device cannot keep
 * up: first by dropping resolution, then by handing the page back to the CSS
 * backdrop entirely.
 *
 * A portfolio that stutters is worse than one without a 3D backdrop, and the
 * devices that struggle are exactly the ones least likely to have a choice.
 * Giving up is permanent, though, so it takes sustained evidence — never one
 * bad moment during a scroll.
 */
export function PerfGuard({ onGiveUp, onDowngrade, downgraded }: Props) {
  const total = useRef(0);
  const frames = useRef(-20); // warm-up: shader compile and texture upload
  const strikes = useRef(0);
  const invalidate = useThree((s) => s.invalidate);

  useFrame((_, delta) => {
    // Ignore the first frames: shader compilation and texture upload are not
    // representative of steady state.
    if (frames.current < 0) {
      frames.current++;
      return;
    }

    const ms = delta * 1000;
    // Backgrounded tabs get throttled to a frame a second; nothing measured
    // there says anything about the device.
    if (ms > STALL_MS || document.hidden) return;

    total.current += ms;
    frames.current++;

    if (frames.current < SAMPLE) return;

    const average = total.current / frames.current;
    total.current = 0;
    frames.current = -20; // cool-off before the next verdict

    if (average > HOPELESS_MS) {
      // Always try half the pixels before writing the device off.
      if (!downgraded) {
        onDowngrade();
        invalidate();
        return;
      }
      strikes.current++;
      if (strikes.current >= STRIKES) onGiveUp();
      return;
    }

    strikes.current = 0;
    if (average > SLOW_MS && !downgraded) {
      onDowngrade();
      invalidate();
    }
  });

  return null;
}
