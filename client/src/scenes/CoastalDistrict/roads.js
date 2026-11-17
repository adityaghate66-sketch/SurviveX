// Road network for Coastal District 001
// Phase 2: Roads and Town Layout
//
// This module defines the road network that connects all parts of the coastal town:
// - Main roads connecting key areas
// - Secondary roads for local access
// - Residential streets
// - Beachfront promenade
// - Harbour access roads
// - River bridge
// - Hill access roads
// - Pedestrian pathways
// - Sidewalks
//
// Roads follow the terrain naturally and provide multiple routes between locations.

// Main Coastal Highway - runs east-west along the coast
export const MAIN_ROAD = {
  name: "Coastal Highway",
  // Runs parallel to the coast, slightly inland from the beach
  start: { x: -350, z: -200 },
  end: { x: 350, z: -200 },
  width: 8,  // 8m wide two-lane road
  type: "arterial",
};

// Beachfront Promenade - runs along the beach
export const BEACH_PROMENADE = {
  name: "Beachfront Promenade",
  // Runs along the beach from southwest to northeast
  start: { x: -150, z: -400 },
  end: { x: 100, z: -250 },
  width: 5,  // 5m wide pedestrian promenade
  type: "promenade",
};

// Harbour Access Road - connects harbor to main road
export const HARBOR_ACCESS = {
  name: "Harbour Access Road",
  start: { x: 80, z: -150 },
  end: HARBOR_CENTER || { x: 150, z: 100 },  // Harbor center
  width: 6,
  type: "collector",
};

// River Bridge - connects east and west sides, crossing the river
export const RIVER_BRIDGE = {
  name: "River Bridge",
  // Bridge starts before river, crosses it, ends after
  start: { x: -50, z: 100 },
  end: { x: 150, z: 150 },
  width: 10,  // 10m wide for two lanes plus shoulders
  type: "bridge",
  // Bridge elevation above river
  elevation: 5,
};

// Hill Access Road - winding road up to the hills
export const HILL_ACCESS_ROAD = {
  name: "Hill Access Road",
  // Winding road from town center up to hills
  waypoints: [
    { x: -100, z: 50 },   // Start at town edge
    { x: -180, z: 120 },   // Turn toward hills
    { x: -240, z: 180 },   // Continue up
    { x: -280, z: 280 },   // Near evacuation shelter
  ],
  width: 4,
  type: "local",
};

// Town Center Roundabout - central traffic circle
export const TOWN_ROUNDABOUT = {
  name: "Town Center Roundabout",
  center: { x: -20, z: 30 },
  radius: 15,
  width: 6,  // Road width at the roundabout
  type: "roundabout",
};

// Residential Street Grid
export const RESIDENTIAL_STREETS = [
  {
    name: "Maple Street",
    start: { x: -100, z: 200 },
    end: { x: 100, z: 200 },
    width: 4,
    type: "residential",
  },
  {
    name: "Oak Street",
    start: { x: -100, z: 260 },
    end: { x: 100, z: 260 },
    width: 4,
    type: "residential",
  },
  {
    name: "Palm Street",
    start: { x: -100, z: 320 },
    end: { x: 100, z: 320 },
    width: 4,
    type: "residential",
  },
];

// Side streets leading to town center
export const SIDE_STREETS = [
  {
    name: "Main to Center",
    start: { x: 20, z: -200 },
    end: { x: 20, z: 0 },
    width: 4,
    type: "connector",
  },
  {
    name: "Market Street",
    start: { x: 60, z: 0 },
    end: { x: 60, z: 100 },
    width: 4,
    type: "commercial",
  },
];

// Beach Access Roads - small roads leading to beach access points
export const BEACH_ACCESS_ROADS = [
  {
    name: "Beach Access 1",
    start: { x: 0, z: -250 },
    end: { x: 0, z: -350 },
    width: 3,
    type: "access",
  },
  {
    name: "Beach Access 2 (West)",
    start: { x: -200, z: -250 },
    end: { x: -200, z: -350 },
    width: 3,
    type: "access",
  },
];

// Pedestrian Walkways
export const PEDESTRIAN_WALKWAYS = [
  {
    name: "Harbor Walkway",
    start: { x: 180, z: 80 },
    end: { x: 180, z: 160 },
    width: 2,
    parallelTo: "harbor-wall",
  },
  {
    name: "Town Square Walkway",
    center: { x: -20, z: 30 },
    radius: 12,
    width: 2,
    type: "circular",
  },
];

// Sidewalk edges (along main roads)
export const SIDEWALKS = {
  // Left and right side of main road
  MAIN_ROAD_SIDEWALKS: generateSidewalkEdges(MAIN_ROAD, 1.5),  // 1.5m sidewalk
  // Beach promenade has built-in sidewalk (it IS the promenade)
  HARBOR_SIDWALLS: {
    width: 1.5,
    location: "along harbor perimeter",
  },
};

// Helper function to generate sidewalk edges for a road
function generateSidewalkEdges(road, sidewalkWidth) {
  // Calculate perpendicular vectors for sidewalk placement
  const dx = road.end.x - road.start.x;
  const dz = road.end.z - road.start.z;
  const length = Math.sqrt(dx * dx + dz * dz);

  // Unit direction vector
  const dirX = dx / length;
  const dirZ = dz / length;

  // Perpendicular (sidewalk goes perpendicular to road direction)
  return {
    left: {
      offset: { x: -dirZ * sidewalkWidth, z: dirX * sidewalkWidth },
    },
    right: {
      offset: { x: dirZ * sidewalkWidth, z: -dirX * sidewalkWidth },
    },
  };
}

// Union of all roads for collision detection
export const ALL_ROADS = [
  MAIN_ROAD,
  BEACH_PROMENADE,
  RIVER_BRIDGE,
  ...RESIDENTIAL_STREETS,
  ...SIDE_STREETS,
  ...BEACH_ACCESS_ROADS,
];

// Get all intersection points between roads
export function getRoadIntersections() {
  const intersections = [];

  // Town roundabout intersection
  intersections.push({
    x: -20, z: 30,
    name: "Town Center",
    roads: ["Main Road", "Residential Streets", "Market Street"],
  });

  // River bridge crossings
  intersections.push({
    x: 50, z: 125,
    name: "River Bridge East End",
  });

  // Beach/Harbor junction
  intersections.push({
    x: 150, z: 130,
    name: "Harbor Junction",
  });

  return intersections;
}

// Get road segments between intersections
export function getConnectedRoadSegments(startName, endName) {
  return {
    "Main Road": {
      between: ["Town Center", "Harbor Junction"],
    },
    "Beach Promenade": {
      between: ["Beach West Access", "Harbor Junction"],
    },
  };
}

// Export a function to check if a point is on a road (within tolerance)
export function isOnRoad(x, z, road, tolerance = 2) {
  const dx = road.end.x - road.start.x;
  const dz = road.end.z - road.start.z;
  const lengthSq = dx * dx + dz * dz;

  if (lengthSq === 0) {
    const dist = Math.sqrt((x - road.start.x) ** 2 + (z - road.start.z) ** 2);
    return dist <= tolerance;
  }

  // Project point onto road line
  const t = ((x - road.start.x) * dx + (z - road.start.z) * dz) / lengthSq;

  if (t < 0 || t > 1) return false;

  const closestX = road.start.x + t * dx;
  const closestZ = road.start.z + t * dz;

  const distSq = (x - closestX) ** 2 + (z - closestZ) ** 2;
  return distSq <= tolerance * tolerance;
}