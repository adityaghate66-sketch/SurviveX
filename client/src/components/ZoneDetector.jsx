import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { findZoneAtPosition } from "../game/zoneDetection.js";

/**
 * Watches the existing player group each frame and reports the zone it enters.
 *
 * This component does not move anything: it only reads `targetRef.current`
 * (the same object Player.jsx updates) and calls `onDiscover` when the player
 * crosses into a new zone. Keeping the previous zone ID in a ref means the
 * callback fires once per entry, not once per frame, and leaving a zone simply
 * clears the ref so a later re-entry is reported again. The parent decides
 * whether that re-entry is a duplicate mission-wise.
 */
export default function ZoneDetector({ targetRef, onDiscover }) {
  const zoneIdRef = useRef(null);
  const onDiscoverRef = useRef(onDiscover);

  useEffect(() => {
    onDiscoverRef.current = onDiscover;
  }, [onDiscover]);

  useFrame(() => {
    const target = targetRef?.current;
    if (!target) return;

    const zone = findZoneAtPosition(target.position);
    const nextZoneId = zone?.id ?? null;

    if (nextZoneId === zoneIdRef.current) return;

    zoneIdRef.current = nextZoneId;
    if (zone) onDiscoverRef.current?.(zone);
  });

  return null;
}
