// Game Room for Colyseus - manages shared world state
import { Room } from "colyseus";
import { SessionState, Player } from "./playerSchema.js";
import { disasterServer } from "../disasters/disasterServer.js";

export class GameRoom extends Room {
  onCreate(options) {
    this.setState(new SessionState());

    this.state.sessionId = options.sessionId || `session-${Date.now()}`;
    this.state.missionCode = options.missionCode || "001";
    this.state.startTime = Date.now();
    this.state.maxClients = options.maxClients || 10;

    // Setup disaster system
    disasterServer.setRoom(this);

    console.log(`[GameRoom] Created room ${this.state.sessionId}`);
  }

  onJoin(client, options) {
    const player = new Player();
    player.id = client.sessionId;
    player.name = options.name || `player-${client.sessionId.slice(0, 8)}`;
    player.x = options.spawnX || -1.6;
    player.y = 0;
    player.z = options.spawnZ || 6.9;
    player.rotY = 0;
    player.active = true;
    player.lastUpdate = Date.now();

    this.state.players.set(client.sessionId, player);
    console.log(`[GameRoom] Player ${player.name} joined`);

    // Notify room of new player
    this.broadcast("playerJoined", {
      playerId: client.sessionId,
      name: player.name
    });
  }

  onLeave(client, consented) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.state.players.delete(client.sessionId);
      console.log(`[GameRoom] Player ${player.name} left`);
    }
  }

  onDispose() {
    console.log(`[GameRoom] Room ${this.state.sessionId} disposed`);
    disasterServer.clear();
  }

  // Handle player position updates
  onMessage(client, message) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    switch (message.type) {
      case "move":
        player.x = message.x;
        player.y = message.y;
        player.z = message.z;
        player.rotY = message.rotY;
        player.lastUpdate = Date.now();
        break;

      case "zoneEnter":
        player.currentZone = message.zoneId;
        break;

      case "disasterTrigger":
        disasterServer.triggerFromClient(message.disasterType);
        break;

      case "extinguishFire":
        disasterServer.extinguishFire(message.fireId);
        break;

      case "takeCover":
        player.isCovered = message.isCovered;
        break;

      case "propPickUp":
        player.activeProp = message.propId;
        break;

      default:
        console.warn(`[GameRoom] Unknown message type: ${message.type}`);
    }
  }

  // Query method to get room state for REST fallback
  getStateForAPI() {
    const players = Array.from(this.state.players.values());
    return {
      sessionId: this.state.sessionId,
      missionCode: this.state.missionCode,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        position: { x: p.x, y: p.y, z: p.z },
        rotY: p.rotY
      })),
      visitedZones: [...this.state.visitedZones],
      progress: this.state.progress,
      status: this.state.status,
      activeDisaster: this.state.activeDisaster
    };
  }
}