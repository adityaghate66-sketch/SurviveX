// Road network for Coastal District 001
// Phase 2: Roads and Town Layout
//
// Every road is a polyline of waypoints so it can bend around terrain and meet
// other roads at a shared point. Roads are rendered in Roads.jsx as ribbons that
// sample the terrain grid, which means they follow the hills instead of
// floating over them.
//
// Network shape (multiple routes between important places):
//
//   Coastal Highway (east-west, z = -180)
//      |-- 3 beach access roads -> Beachfront Promenade (z = -248)
//      |-- Town Spine north (z = -180 -> 260) -> residential + hill road
//      |-- Highway Bridge over the river -> east district -> harbour quay
//
//   Market Street (town square -> Market Bridge -> east district)
//      |-- east loop -> harbour quay            (second route to the harbour)
//
//   Hill Access Road: town -> evacuation shelter on the northwest hill

import {
  HARBOR,
  RIVER,
  getTerrainHeight,
  riverCentreAtZ,
  riverWidthAtZ,
} from "./terrain.js";

const BRIDGE_OVERHANG = 12; // deck extends this far past the channel bank

// Bridges are derived from the river itself, so a road can never end at a river
// bank or cross the water without a deck.
function bridgeSpanAtZ(z) {
  const riverX = riverCentreAtZ(z);
  const halfChannel = riverWidthAtZ(z) / 2;
  return {
    riverX,
    west: { x: riverX - halfChannel - BRIDGE_OVERHANG, z },
    east: { x: riverX + halfChannel + BRIDGE_OVERHANG, z },
    length: halfChannel * 2 + BRIDGE_OVERHANG * 2,
  };
}

const HIGHWAY_BRIDGE_SPAN = bridgeSpanAtZ(-180);
const MARKET_BRIDGE_SPAN = bridgeSpanAtZ(0);

// Walk inwards from the water until the ground is high enough for a quay.
// Keeps the harbour road on land no matter how the basin is tuned later.
function findQuayPoint(minHeight = 1.2) {
  const centre = HARBOR.CENTER;
  const approach = { x: 200, z: -180 };
  const dx = approach.x - centre.x;
  const dz = approach.z - centre.z;
  const length = Math.hypot(dx, dz) || 1;
  const ux = dx / length;
  const uz = dz / length;

  let quay = null;

  for (let distance = 90; distance > 8; distance -= 0.5) {
    const x = centre.x + ux * distance;
    const z = centre.z + uz * distance;
    const height = getTerrainHeight(x, z);

    if (height >= minHeight) {
      quay = { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 };
    } else if (quay) {
      // First point inside the basin after the shoreline: stop at the quay.
      break;
    }
  }

  return quay ?? { x: centre.x + ux * 60, z: centre.z + uz * 60 };
}

export const HARBOUR_QUAY = findQuayPoint();

export const COASTAL_HIGHWAY = {
  name: "Coastal Highway",
  waypoints: [
    { x: -330, z: -180 },
    { x: -180, z: -178 },
    { x: 0, z: -180 },
    { x: HIGHWAY_BRIDGE_SPAN.west.x, z: -180 },
  ],
  width: 9,
  sidewalk: true,
  type: "arterial",
};

export const HIGHWAY_BRIDGE = {
  name: "Highway River Bridge",
  start: HIGHWAY_BRIDGE_SPAN.west,
  end: HIGHWAY_BRIDGE_SPAN.east,
  width: 9,
  type: "bridge",
};

export const HARBOUR_ROAD = {
  name: "Harbour Access Road",
  waypoints: [
    HIGHWAY_BRIDGE_SPAN.east,
    { x: 232, z: -196 },
    HARBOUR_QUAY,
  ],
  width: 7,
  type: "collector",
};

export const MARKET_STREET = {
  name: "Market Street",
  waypoints: [
    { x: 0, z: 0 },
    { x: 60, z: 0 },
    { x: MARKET_BRIDGE_SPAN.west.x, z: 0 },
  ],
  width: 7,
  sidewalk: true,
  type: "commercial",
};

export const MARKET_BRIDGE = {
  name: "Market River Bridge",
  start: MARKET_BRIDGE_SPAN.west,
  end: MARKET_BRIDGE_SPAN.east,
  width: 7,
  type: "bridge",
};

export const EAST_DISTRICT = {
  name: "East District Loop",
  waypoints: [
    MARKET_BRIDGE_SPAN.east,
    { x: 285, z: 5 },
    { x: 305, z: -85 },
    { x: 275, z: -165 },
    HARBOUR_QUAY,
  ],
  width: 6,
  type: "collector",
};

export const TOWN_SPINE = {
  name: "Town Spine",
  waypoints: [
    { x: 0, z: -180 },
    { x: 0, z: -90 },
    { x: 0, z: 0 },
    { x: 0, z: 140 },
    { x: 0, z: 260 },
  ],
  width: 8,
  sidewalk: true,
  type: "arterial",
};

export const BEACH_PROMENADE = {
  name: "Beachfront Promenade",
  waypoints: [
    { x: -300, z: -248 },
    { x: -150, z: -246 },
    { x: 0, z: -248 },
    { x: 140, z: -246 },
  ],
  width: 5,
  type: "promenade",
};

export const RESIDENTIAL_STREETS = [
  {
    name: "Maple Street",
    waypoints: [
      { x: -130, z: 140 },
      { x: 0, z: 142 },
      { x: 60, z: 140 },
    ],
    width: 5,
    type: "residential",
  },
  {
    name: "Oak Street",
    waypoints: [
      { x: -130, z: 200 },
      { x: 0, z: 201 },
      { x: 60, z: 200 },
    ],
    width: 5,
    type: "residential",
  },
  {
    name: "Palm Street",
    waypoints: [
      { x: -130, z: 262 },
      { x: 0, z: 260 },
      { x: 60, z: 262 },
    ],
    width: 5,
    type: "residential",
  },
];

// Small connector so the three residential streets are not a dead-end ladder.
export const RESIDENTIAL_CROSS_STREET = {
  name: "Church Cross Street",
  waypoints: [
    { x: 55, z: 110 },
    { x: 55, z: 200 },
    { x: 55, z: 280 },
  ],
  width: 5,
  type: "residential",
};

export const HILL_ACCESS_ROAD = {
  name: "Hill Access Road",
  waypoints: [
    { x: 0, z: 120 },
    { x: -60, z: 148 },
    { x: -130, z: 178 },
    { x: -200, z: 212 },
    { x: -250, z: 250 },
    { x: -285, z: 285 },
  ],
  width: 5,
  type: "hill",
};

export const BEACH_ACCESS_ROADS = [
  {
    name: "Beach Access West",
    waypoints: [
      { x: -240, z: -180 },
      { x: -240, z: -214 },
      { x: -240, z: -247 },
    ],
    width: 4,
    type: "access",
  },
  {
    name: "Beach Access Central",
    waypoints: [
      { x: -120, z: -180 },
      { x: -120, z: -214 },
      { x: -120, z: -247 },
    ],
    width: 4,
    type: "access",
  },
  {
    name: "Beach Access East",
    waypoints: [
      { x: 90, z: -180 },
      { x: 90, z: -214 },
      { x: 90, z: -247 },
    ],
    width: 4,
    type: "access",
  },
];

export const RIVER_BRIDGE = HIGHWAY_BRIDGE; // kept for backwards compatibility

// Every driveable/pedestrian surface, in render order (bridges last).
export const ALL_ROADS = [
  COASTAL_HIGHWAY,
  TOWN_SPINE,
  MARKET_STREET,
  HARBOUR_ROAD,
  EAST_DISTRICT,
  RESIDENTIAL_CROSS_STREET,
  ...RESIDENTIAL_STREETS,
  ...BEACH_ACCESS_ROADS,
  HILL_ACCESS_ROAD,
  BEACH_PROMENADE,
];

export const BRIDGES = [HIGHWAY_BRIDGE, MARKET_BRIDGE];

// Junction markers. Filled roads deserve a disc/ring so the seam between two
// ribbons does not show through as grass.
export function getRoadIntersections() {
  return [
    { x: 0, z: -180, name: "Highway / Town Spine", radius: 7 },
    { x: -240, z: -180, name: "Highway / West Beach Access", radius: 5 },
    { x: -120, z: -180, name: "Highway / Central Beach Access", radius: 5 },
    { x: 90, z: -180, name: "Highway / East Beach Access", radius: 5 },
    { x: 0, z: 0, name: "Town Square", radius: 16, roundabout: true },
    { x: 0, z: 140, name: "Town Spine / Maple Street", radius: 5 },
    { x: 0, z: 200, name: "Town Spine / Oak Street", radius: 5 },
    { x: 0, z: 260, name: "Town Spine / Palm Street", radius: 5 },
    { x: 0, z: 120, name: "Town Spine / Hill Road", radius: 5 },
    { x: 55, z: 140, name: "Maple / Church Cross", radius: 4 },
    { x: 55, z: 200, name: "Oak / Church Cross", radius: 4 },
    { x: 55, z: 260, name: "Palm / Church Cross", radius: 4 },
  ];
}

// Check whether a point sits on a road surface (used by Phase 6 collision and
// by the layout tests).
export function isOnRoad(x, z, road, tolerance = 2) {
  const points =
    road.waypoints ?? (road.start && road.end ? [road.start, road.end] : []);

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz;

    if (lengthSq === 0) {
      if (Math.hypot(x - a.x, z - a.z) <= tolerance) return true;
      continue;
    }

    const t = ((x - a.x) * dx + (z - a.z) * dz) / lengthSq;
    const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
    const closestX = a.x + clamped * dx;
    const closestZ = a.z + clamped * dz;

    if (Math.hypot(x - closestX, z - closestZ) <= tolerance) return true;
  }

  return false;
}

export function isOnAnyRoad(x, z) {
  return ALL_ROADS.some((road) => isOnRoad(x, z, road, road.width / 2));
}

export { RIVER };
