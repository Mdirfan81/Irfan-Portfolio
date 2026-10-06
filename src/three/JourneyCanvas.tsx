import { useCallback, useRef, useState } from "react";
import { Canvas, useFrame, type RootState } from "@react-three/fiber";
import { JourneyScene } from "./JourneyScene";
import { PerfGuard } from "./PerfGuard";
import { useJourneyInput } from "@/lib/useJourneyInput";
import { useThemeColors } from "@/lib/useThemeColors";
import styles from "./JourneyCanvas.module.css";

type Props = {
  quality: "low" | "high";
  still: boolean;
  /** Raised when the device cannot render the scene smoothly. */
  onGiveUp: () => void;
  /** Raised once, as the scene draws for the first time. */
  onFirstFrame: () => void;
};

/** Frames a moving scene draws before it is called ready. */
const SETTLE_FRAMES = 4;

/**
 * Reports that the scene is on screen. Mounting the canvas is not the same as
 * having something on it, and the very first draws are the slow ones: buffers
 * are uploaded and the GPU builds its pipelines. Those are let through first,
 * while the loader still has the page covered. A still scene only ever gets
 * one frame, so that one has to do.
 */
function FirstFrame({ still, onFirstFrame }: Pick<Props, "still" | "onFirstFrame">) {
  const frames = useRef(0);

  useFrame(() => {
    frames.current++;
    if (frames.current === (still ? 1 : SETTLE_FRAMES)) onFirstFrame();
  });

  return null;
}

/**
 * The persistent 3D layer. Fixed behind the whole document and inert to
 * pointer events, so every DOM control on top of it keeps working normally.
 *
 * Loaded lazily — three.js is the largest thing on the page and nothing here is
 * needed for the content to be readable.
 */
export default function JourneyCanvas({ quality, still, onGiveUp, onFirstFrame }: Props) {
  const input = useJourneyInput();
  const colors = useThemeColors();
  const [downgraded, setDowngraded] = useState(false);
  // The layer stays transparent until there is a frame to show, then fades in,
  // so the scene and its scrim never land on the page in one jump.
  const [drawn, setDrawn] = useState(false);
  const [warm, setWarm] = useState(false);
  const handleWarm = useCallback(() => setWarm(true), []);

  const handleFirstFrame = useCallback(() => {
    setDrawn(true);
    onFirstFrame();
  }, [onFirstFrame]);

  const effectiveQuality = downgraded ? "low" : quality;
  const dpr: [number, number] | number =
    downgraded || quality === "low" ? 1 : ([1, 1.6] as [number, number]);

  const handleDowngrade = useCallback(() => setDowngraded(true), []);

  const handleCreated = useCallback(({ gl, invalidate }: RootState) => {
    const canvas = gl.domElement;
    // Browsers drop the GL context under memory pressure or a GPU reset. Unless
    // the default is prevented they never restore it, and the backdrop stays
    // blank for the rest of the session.
    canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
    canvas.addEventListener("webglcontextrestored", () => invalidate());
  }, []);

  return (
    <div
      className={`${styles.layer} ${drawn ? styles.drawn : ""}`}
      aria-hidden="true"
      data-testid="journey-canvas"
    >
      <Canvas
        className={styles.canvas}
        dpr={dpr}
        // No frames until the shaders are compiled: see Warmup in JourneyScene.
        frameloop={!warm ? "never" : still ? "demand" : "always"}
        camera={{ fov: 62, near: 0.1, far: 90, position: [0, 0.2, 7] }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
        onCreated={handleCreated}
      >
        <JourneyScene
          input={input}
          colors={colors}
          quality={effectiveQuality}
          still={still}
          onWarm={handleWarm}
        />
        <FirstFrame still={still} onFirstFrame={handleFirstFrame} />
        {!still && (
          <PerfGuard
            onGiveUp={onGiveUp}
            onDowngrade={handleDowngrade}
            downgraded={downgraded}
          />
        )}
      </Canvas>
      {/* Scrim: keeps body copy legible over the scene without flattening it. */}
      <div className={styles.scrim} />
    </div>
  );
}
