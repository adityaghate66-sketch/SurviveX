// Road renderer for Coastal District 001
// Phase 2: Roads and Town Layout
//
// Roads are built as ribbons that sample the visible terrain grid at every
// cross-section, so they climb the hills, follow the coastal plain and never
// float. The old implementation used flat BoxGeometry slabs at y = 0, which
// were 8m tall, buried ~9m underground and invisible.

import { useMemo } from "react";
import * as THREE from "three";
import { getMeshHeight } from "./terrain.js";
import {
  ALL_ROADS,
  BRIDGES,
  BEACH_PROMENADE,
  bridgeDeckHeightAt,
  getRoadIntersections,
  HARBOUR_QUAY,
} from "./roads.js";

// Shared materials: one instance each keeps the renderer from allocating a
// material per road segment.
const MATERIALS = {
  asphalt: new THREE.MeshStandardMaterial({ color: "#3f4245", roughness: 0.88, metalness: 0.05 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: "#c6c0ad", roughness: 0.95, metalness: 0 }),
  promenade: new THREE.MeshStandardMaterial({ color: "#cbbf9e", roughness: 0.95, metalness: 0 }),
  bridge: new THREE.MeshStandardMaterial({ color: "#8a8a82", roughness: 0.8, metalness: 0.05 }),
  railing: new THREE.MeshStandardMaterial({ color: "#6f7377", roughness: 0.5, metalness: 0.55 }),
  island: new THREE.MeshStandardMaterial({ color: "#5d8046", roughness: 1, metalness: 0 }),
};

const ROAD_LIFT = 0.18;
const SIDEWALK_LIFT = 0.24;

// Resample a waypoint polyline into evenly spaced points with tangents and
// left/right normals. Catmull-Rom keeps corners smooth while still passing
// exactly through every waypoint (so junctions line up).
function samplePolyline(waypoints, spacing = 6) {
  const curve = new THREE.CatmullRomCurve3(
    waypoints.map((point) => new THREE.Vector3(point.x, 0, point.z))
  );
  const length = curve.getLength();
  const count = Math.max(2, Math.ceil(length / spacing));

  const samples = [];
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    curve.getPointAt(t, point);
    curve.getTangentAt(t, tangent);

    const nx = -tangent.z;
    const nz = tangent.x;
    const normalLength = Math.hypot(nx, nz) || 1;

    samples.push({
      x: point.x,
      z: point.z,
      nx: nx / normalLength,
      nz: nz / normalLength,
      distance: length * t,
    });
  }

  return samples;
}

// Build a strip of triangles that hugs the terrain.
function buildRibbon(waypoints, width, options = {}) {
  const {
    spacing = 6,
    lift = ROAD_LIFT,
    lateralOffset = 0,
    heightAt = null, // optional (x, z, t) => worldY, used by bridges
  } = options;

  const samples = samplePolyline(waypoints, spacing);
  const halfWidth = width / 2;

  const positions = [];
  const uvs = [];
  const indices = [];

  samples.forEach((sample, index) => {
    const t = index / (samples.length - 1);
    const centreX = sample.x + sample.nx * lateralOffset;
    const centreZ = sample.z + sample.nz * lateralOffset;

    const leftX = centreX + sample.nx * halfWidth;
    const leftZ = centreZ + sample.nz * halfWidth;
    const rightX = centreX - sample.nx * halfWidth;
    const rightZ = centreZ - sample.nz * halfWidth;

    const leftY = heightAt
      ? heightAt(leftX, leftZ, t) + lift
      : getMeshHeight(leftX, leftZ) + lift;
    const rightY = heightAt
      ? heightAt(rightX, rightZ, t) + lift
      : getMeshHeight(rightX, rightZ) + lift;

    positions.push(leftX, leftY, leftZ, rightX, rightY, rightZ);
    uvs.push(0, sample.distance / width, 1, sample.distance / width);

    if (index < samples.length - 1) {
      const a = index * 2;
      // Wind so the surface normal points up.
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function Ribbon({ waypoints, width, material, lift = ROAD_LIFT, lateralOffset = 0, spacing = 6 }) {
  const geometry = useMemo(
    () => buildRibbon(waypoints, width, { lift, lateralOffset, spacing }),
    [waypoints, width, lift, lateralOffset, spacing]
  );

  return <mesh geometry={geometry} material={material} receiveShadow />;
}

// Sidewalks sit on both shoulders of arterial/commercial roads.
function Sidewalks({ waypoints, width }) {
  const offset = width / 2 + 1.1;
  return (
    <>
      <Ribbon waypoints={waypoints} width={2.2} lateralOffset={offset} lift={SIDEWALK_LIFT} material={MATERIALS.sidewalk} />
      <Ribbon waypoints={waypoints} width={2.2} lateralOffset={-offset} lift={SIDEWALK_LIFT} material={MATERIALS.sidewalk} />
    </>
  );
}

// Bridge deck: flat across the span, rising in a gentle arc above the water.
// Rails and posts make it read as a bridge instead of a floating road.
function Bridge({ bridge }) {
  const { start, end, width } = bridge;

  const deck = useMemo(() => {
    const span = Math.hypot(end.x - start.x, end.z - start.z);

    // Same function the player physics uses, so the walkable deck and the
    // visible deck can never disagree.
    const heightAt = (x, z, t) => bridgeDeckHeightAt(bridge, t);

    const geometry = buildRibbon([start, end], width, {
      spacing: Math.max(3, span / 12),
      lift: 0,
      heightAt,
    });

    // Edge rails: two thin ribbons at railing height.
    const railLeft = buildRibbon([start, end], 0.22, {
      spacing: Math.max(3, span / 12),
      lift: 1.05,
      lateralOffset: width / 2 - 0.25,
      heightAt,
    });
    const railRight = buildRibbon([start, end], 0.22, {
      spacing: Math.max(3, span / 12),
      lift: 1.05,
      lateralOffset: -(width / 2 - 0.25),
      heightAt,
    });

    // Vertical posts down the rail.
    const posts = [];
    const postCount = Math.max(4, Math.round(span / 6));
    for (let i = 0; i <= postCount; i++) {
      const t = i / postCount;
      const y = heightAt(start.x, start.z, t);
      const x = start.x + (end.x - start.x) * t;
      const z = start.z + (end.z - start.z) * t;
      const sideOffset = width / 2 - 0.25;
      // Perpendicular of a straight deck.
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz) || 1;
      const nx = -dz / length;
      const nz = dx / length;
      for (const sign of [1, -1]) {
        posts.push({
          position: [x + nx * sideOffset * sign, y + 0.55, z + nz * sideOffset * sign],
        });
      }
    }

    return { geometry, railLeft, railRight, posts };
  }, [start, end, width]);

  return (
    <group name={`bridge-${bridge.name}`}>
      <mesh geometry={deck.geometry} material={MATERIALS.bridge} castShadow receiveShadow />
      <mesh geometry={deck.railLeft} material={MATERIALS.railing} />
      <mesh geometry={deck.railRight} material={MATERIALS.railing} />
      {deck.posts.map((post, index) => (
        <mesh key={`post-${index}`} position={post.position} material={MATERIALS.railing}>
          <boxGeometry args={[0.18, 1.1, 0.18]} />
        </mesh>
      ))}
    </group>
  );
}

// Town square roundabout: asphalt ring with a planted island.
function Roundabout() {
  const { x, z, radius } = getRoadIntersections().find((item) => item.roundabout);
  const y = getMeshHeight(x, z) + ROAD_LIFT + 0.03;

  return (
    <group position={[x, y, z]} name="town-square-roundabout">
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={MATERIALS.asphalt} receiveShadow>
        <ringGeometry args={[radius * 0.62, radius, 48]} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} material={MATERIALS.island} receiveShadow>
        <circleGeometry args={[radius * 0.6, 40]} />
      </mesh>
    </group>
  );
}

// Filled discs hide the seams where two ribbons meet.
function Junction({ x, z, radius }) {
  const y = getMeshHeight(x, z) + ROAD_LIFT + 0.04;
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} material={MATERIALS.asphalt} receiveShadow>
      <circleGeometry args={[radius, 28]} />
    </mesh>
  );
}

export default function Roads() {
  const intersections = getRoadIntersections();

  return (
    <group name="roads">
      {ALL_ROADS.map((road) => {
        const material = road === BEACH_PROMENADE ? MATERIALS.promenade : MATERIALS.asphalt;
        return (
          <group key={road.name} name={road.name}>
            <Ribbon
              waypoints={road.waypoints}
              width={road.width}
              material={material}
              lift={road === BEACH_PROMENADE ? 0.14 : ROAD_LIFT}
            />
            {road.sidewalk && <Sidewalks waypoints={road.waypoints} width={road.width} />}
          </group>
        );
      })}

      {intersections
        .filter((junction) => !junction.roundabout)
        .map((junction) => (
          <Junction key={junction.name} x={junction.x} z={junction.z} radius={junction.radius} />
        ))}

      <Roundabout />

      {BRIDGES.map((bridge) => (
        <Bridge key={bridge.name} bridge={bridge} />
      ))}

      {/* Small stone quay edge at the harbour landing. */}
      <mesh
        position={[HARBOUR_QUAY.x, getMeshHeight(HARBOUR_QUAY.x, HARBOUR_QUAY.z) + 0.1, HARBOUR_QUAY.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={MATERIALS.bridge}
        receiveShadow
      >
        <circleGeometry args={[9, 24]} />
      </mesh>
    </group>
  );
}

export { getRoadIntersections };
