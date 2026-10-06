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

/**
 * Reports the first frame. Mounting the canvas is not the same as having
 * something on it: the shaders still have to compile, and until they have the
 * layer is an empty rectangle.
 */
function FirstFrame({ onFirstFrame }: Pick<Props, "onFirstFrame">) {
  const reported = useRef(false);

  useFrame(() => {
    if (reported.current) return;
    reported.current = true;
    onFirstFrame();
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
        frameloop={still ? "demand" : "always"}
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
        />
        <FirstFrame onFirstFrame={handleFirstFrame} />
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
