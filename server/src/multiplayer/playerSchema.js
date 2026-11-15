// Player state schema for Colyseus multiplayer synchronization
import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") z = 0;
  @type("number") rotY = 0;
  @type("boolean") active = false;
  @type("string") currentZone = "";
  @type("number") lastUpdate = 0;
  @type("boolean") isCovered = false;
  @type("string") activeProp = null;
}

export class SessionState extends Schema {
  @type("string") sessionId = "";
  @type("string") missionCode = "";
  @type("number") startTime = 0;
  @type(["string"]) visitedZones = new ArraySchema();
  @type("number") progress = 0;
  @type("string") status = "ACTIVE";

  @type({ map: Player }) players = new MapSchema();

  @type("number") disasterPhase = 0;
  @type("string") activeDisaster = "";
  @type("number") disasterStartTime = 0;

  @type("number") lastZoneUpdate = 0;
  @type("number") lastDisasterUpdate = 0;
}