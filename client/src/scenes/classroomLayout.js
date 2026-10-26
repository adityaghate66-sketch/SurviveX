// Shared classroom layout.
//
// Both the 3D scene (Classroom.jsx) and the player physics (Player.jsx) need to
// agree on where things are. Keeping the numbers here means a desk can never be
// drawn in one place and block the player somewhere else.

export const ROOM = {
  width: 18, // x axis
  depth: 16, // z axis
  height: 7, // y axis
};

// Inner face of each wall. The player is kept inside these numbers.
export const ROOM_BOUNDS = {
  minX: -(ROOM.width / 2) + 0.125, // left wall inner face
  maxX: ROOM.width / 2 - 0.125, // right wall inner face
  minZ: -(ROOM.depth / 2) + 0.125, // back wall inner face
  maxZ: ROOM.depth / 2 - 0.125, // front of the room (open side)
};

// Layout of the 3x3 grid of student desks.
export const DESK_GRID = {
  rows: 3,
  columns: 3,
  spacingX: 3.2,
  spacingZ: 3.1,
  firstRowZ: -1.5,
};

function createDesks() {
  const desks = [];

  for (let row = 0; row < DESK_GRID.rows; row++) {
    for (let column = 0; column < DESK_GRID.columns; column++) {
      desks.push({
        id: `${row}-${column}`,
        position: [
          (column - (DESK_GRID.columns - 1) / 2) * DESK_GRID.spacingX,
          0,
          DESK_GRID.firstRowZ + row * DESK_GRID.spacingZ,
        ],
      });
    }
  }

  return desks;
}

// Each entry: { id, position: [x, y, z] }
export const DESKS = createDesks();

// A desk blocks its tabletop plus the chair tucked behind it (positive z).
const DESK_HALF_WIDTH = 0.9;
const DESK_FRONT = 0.45;
const DESK_BACK = 1.35;

// Teacher's desk sits against the back wall.
export const TEACHER_DESK = { position: [0, 0.65, -5.5], size: [2.8, 1.2, 1] };

// Axis-aligned boxes on the floor plan that the player cannot walk through.
export const OBSTACLES = [
  {
    minX: TEACHER_DESK.position[0] - TEACHER_DESK.size[0] / 2,
    maxX: TEACHER_DESK.position[0] + TEACHER_DESK.size[0] / 2,
    minZ: TEACHER_DESK.position[2] - TEACHER_DESK.size[2] / 2,
    maxZ: TEACHER_DESK.position[2] + TEACHER_DESK.size[2] / 2,
  },
  ...DESKS.map((desk) => {
    const [x, , z] = desk.position;
    return {
      minX: x - DESK_HALF_WIDTH,
      maxX: x + DESK_HALF_WIDTH,
      minZ: z - DESK_FRONT,
      maxZ: z + DESK_BACK,
    };
  }),
];

// Where the player spawns: front of the room, in the aisle between the two
// left-hand desk columns so walking forward has clear space.
export const PLAYER_SPAWN = [-1.6, 0, 6.9];
