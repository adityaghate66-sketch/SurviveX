// Exploration zones for Mission 001 — Know Your Surroundings.
//
// A zone is a simple axis-aligned rectangle on the classroom floor. The
// numbers below are real classroom coordinates taken from classroomLayout.js:
//
//   room x: -9 .. 9, room z: -8 .. 8 (back wall at z = -8, open side at z = 8)
//   teacher desk: x -1.4 .. 1.4, z -6 .. -5
//   student desks: 3 columns at x -3.2 / 0 / 3.2, 3 rows at z -1.5 / 1.6 / 4.7
//   windows: left wall (x = -9) at z -4.5 / 0 / 4.5
//
// Zones deliberately do not overlap, so exactly one zone can be active for a
// given player position. Keeping this list in one place means the client and
// the notification UI always agree on names and IDs.

import { ROOM, TEACHER_DESK } from "../scenes/classroomLayout.js";

const BACK_WALL_Z = -ROOM.depth / 2;
const PLAYER_MAX_Z = ROOM.depth / 2 - 0.5; // reachable front edge (radius included)

export const ZONES = Object.freeze([
  {
    id: "teacher-desk",
    name: "Teacher Desk",
    description: "The teacher's workstation at the front of the classroom.",
    bounds: {
      minX: -4.5,
      maxX: 4.5,
      minZ: BACK_WALL_Z + 0.1,
      // Just in front of the teacher's desk, which sits at z = -5.5.
      maxZ: TEACHER_DESK.position[2] + 1.1,
    },
  },
  {
    id: "student-desks",
    name: "Student Desk Area",
    description: "The 3x3 grid where students sit and work.",
    bounds: {
      minX: -4.6,
      maxX: 4.6,
      minZ: -4.2,
      maxZ: 6.2,
    },
  },
  {
    id: "windows",
    name: "Windows",
    description: "The row of windows along the left-hand wall.",
    bounds: {
      minX: -ROOM.width / 2 + 0.5,
      maxX: -6,
      minZ: -5.8,
      maxZ: 5.4,
    },
  },
  {
    id: "classroom-entrance",
    name: "Classroom Entrance",
    description: "The open front corner the class enters through.",
    bounds: {
      minX: -ROOM.width / 2 + 0.5,
      maxX: -4.8,
      minZ: 5.6,
      maxZ: PLAYER_MAX_Z,
    },
  },
  {
    id: "open-safe-area",
    name: "Open Safe Area",
    description: "The clear aisle on the right side of the room.",
    bounds: {
      minX: 5,
      maxX: ROOM.width / 2 - 0.5,
      minZ: BACK_WALL_Z + 0.6,
      maxZ: PLAYER_MAX_Z,
    },
  },
]);

export const ZONE_IDS = Object.freeze(ZONES.map((zone) => zone.id));
