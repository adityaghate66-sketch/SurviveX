import { useFrame } from "@react-three/fiber";
import { hazardsRegistry } from "../game/hazards.js";

// WorldUpdater component - runs inside Canvas to update hazards each frame
// This is necessary because useFrame must be called inside a Canvas child component
export default function WorldUpdater({
  activeProp,
  hazardState,
  checkProximityToHazards
}) {
  useFrame((state, delta) => {
    // Always update hazards physics (~60fps)
    const dt = Math.min(delta, 0.016); // cap delta at ~60fps
    hazardsRegistry.update(dt);

    // Check proximity to hazards when playing
    checkProximityToHazards();

    // Handle fire extinguisher interaction (F key). The prop id
    // ("extinguisher-1") and the hazard id ("fire-hallway") are different, so
    // the check has to be on the prop *type*; proximity was checked above.
    if (activeProp?.type === "fire-extinguisher" && hazardState.activeHazard) {
      const extinguishResult = hazardState.activeHazard.extinguish(0.5);
      if (!extinguishResult) {
        hazardsRegistry.particleSystem.emit(hazardState.activeHazard.position, 5);
      } else {
        // Hazard extinguished - will be handled by parent state
      }
    }
  });

  return null;
}