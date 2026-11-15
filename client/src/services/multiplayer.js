// Multiplayer client service using Colyseus
import { Client } from "colyseus.js";

const ENDPOINT = "ws://localhost:4000";

class MultiplayerClient {
  constructor() {
    this.client = new Client(ENDPOINT);
    this.room = null;
    this.onStateChange = null;
  }

  async joinRoom(sessionId, { name, spawnX, spawnZ }) {
    try {
      this.room = await this.client.joinOrCreate("game_room", {
        sessionId,
        name,
        spawnX,
        spawnZ
      });

      console.log(`[Multiplayer] Joined room ${this.room.id}`);
      this.setupRoomListeners();
      return this.room;
    } catch (e) {
      console.error("[Multiplayer] Join failed", e);
      return null;
    }
  }

  setupRoomListeners() {
    this.room.onStateChange((state) => {
      if (this.onStateChange) this.onStateChange(state);
    });

    this.room.onMessage("playerJoined", (message) => {
      console.log(`[Multiplayer] Player ${message.name} joined`);
    });

    this.room.onMessage("disasterStart", (message) => {
      console.log(`[Multiplayer] Disaster started:`, message);
      // Logic to trigger disaster visual in App.jsx
    });
  }

  sendMove(x, y, z, rotY) {
    if (!this.room) return;
    this.room.send("move", { x, y, z, rotY });
  }

  sendZoneEnter(zoneId) {
    if (!this.room) return;
    this.room.send("zoneEnter", { zoneId });
  }

  sendAction(type, data) {
    if (!this.room) return;
    this.room.send(type, data);
  }

  leave() {
    if (this.room) this.room.leave();
  }
}

export const multiplayerClient = new MultiplayerClient();