import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/**
 * Compiles the droids' shaders before their first frame. Left to the first
 * frame, compiling is synchronous and holds the GPU, and every canvas on the
 * page stops with it — the journey scene behind included — which showed as a
 * 200–500ms stall as each droid canvas arrived. The canvas keeps its frame
 * loop off until this reports. See Warmup in JourneyScene for the same thing.
 */
export function CompileFirst({ onReady }: { onReady: () => void }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    let cancelled = false;
    gl.compileAsync(scene, camera)
      // A failed warm-up costs nothing but the stall it was there to avoid.
      .catch(() => {})
      .then(() => {
        if (!cancelled) onReady();
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, onReady]);

  return null;
}
