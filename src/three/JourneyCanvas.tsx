import { useCallback, useState } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
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
};

/**
 * The persistent 3D layer. Fixed behind the whole document and inert to
 * pointer events, so every DOM control on top of it keeps working normally.
 *
 * Loaded lazily — three.js is the largest thing on the page and nothing here is
 * needed for the content to be readable.
 */
export default function JourneyCanvas({ quality, still, onGiveUp }: Props) {
  const input = useJourneyInput();
  const colors = useThemeColors();
  const [downgraded, setDowngraded] = useState(false);

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
      className={styles.layer}
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
