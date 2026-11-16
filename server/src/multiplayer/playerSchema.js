// Player state schema for Colyseus multiplayer synchronization
import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  constructor() {
    super();
    this.id = "";
    this.name = "";
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.rotY = 0;
    this.active = false;
    this.currentZone = "";
    this.lastUpdate = 0;
    this.isCovered = false;
    this.activeProp = null;
  }
}

// Register types for Player
type("string")(Player.prototype, "id");
type("string")(Player.prototype, "name");
type("number")(Player.prototype, "x");
type("number")(Player.prototype, "y");
type("number")(Player.prototype, "z");
type("number")(Player.prototype, "rotY");
type("boolean")(Player.prototype, "active");
type("string")(Player.prototype, "currentZone");
type("number")(Player.prototype, "lastUpdate");
type("boolean")(Player.prototype, "isCovered");
type("string")(Player.prototype, "activeProp");

export class SessionState extends Schema {
  constructor() {
    super();
    this.sessionId = "";
    this.missionCode = "";
    this.startTime = 0;
    this.visitedZones = new ArraySchema();
    this.progress = 0;
    this.status = "ACTIVE";
    this.players = new MapSchema();
    this.disasterPhase = 0;
    this.activeDisaster = "";
    this.disasterStartTime = 0;
    this.lastZoneUpdate = 0;
    this.lastDisasterUpdate = 0;
  }
}

// Register types for SessionState
type("string")(SessionState.prototype, "sessionId");
type("string")(SessionState.prototype, "missionCode");
type("number")(SessionState.prototype, "startTime");
type(["string"])(SessionState.prototype, "visitedZones");
type("number")(SessionState.prototype, "progress");
type("string")(SessionState.prototype, "status");
type({ map: Player })(SessionState.prototype, "players");
type("number")(SessionState.prototype, "disasterPhase");
type("string")(SessionState.prototype, "activeDisaster");
type("number")(SessionState.prototype, "disasterStartTime");
type("number")(SessionState.prototype, "lastZoneUpdate");
type("number")(SessionState.prototype, "lastDisasterUpdate");
