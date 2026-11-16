// Multiplayer client service using Colyseus SDK 0.18
// Must match server's colyseus version exactly

const IsBrowser = typeof window !== "undefined";

class MultiplayerClient {
  constructor() {
    this.client = null;
    this.room = null;
    this.onStateChange = null;
  }

  async initialize() {
    if (!IsBrowser) return false;

    try {
      // Use @colyseus/sdk which is compatible with colyseus 0.18 server
      const { Client } = await import("@colyseus/sdk");
      this.Client = Client;
      this.client = new Client("ws://localhost:4000");
      return true;
    } catch (e) {
      console.warn("[Multiplayer] @colyseus/sdk not available, using local mode");
      return false;
    }
  }

  async joinRoom(sessionId, { name, spawnX, spawnZ }) {
    if (!this.Client || !this.client) return null;

    try {
      // joinOrCreate returns a Room with client.sessionId as player ID
      this.room = await this.client.joinOrCreate("game_room", {
        sessionId,
        name,
        spawnX,
        spawnZ,
        // The server expects sessionId as the client identifier
      });

      console.log(`[Multiplayer] Joined room ${this.room.roomId ?? this.room.id}`);
      this.setupRoomListeners();
      return this.room;
    } catch (e) {
      console.error("[Multiplayer] Join failed", e);
      return null;
    }
  }

  setupRoomListeners() {
    if (!this.room) return;

    // Listen for state changes from the server
    this.room.onStateChange((state) => {
      if (this.onStateChange) this.onStateChange(state);
    });

    this.room.onMessage("disasterStart", (message) => {
      console.log(`[Multiplayer] Disaster started:`, message);
    });

    this.room.onMessage("playerJoined", (message) => {
      console.log(`[Multiplayer] playerJoined:`, message);
    });

    this.room.onMessage("playerLeft", (message) => {
      console.log(`[Multiplayer] playerLeft:`, message);
    });
  }

  /**
   * Send player movement to server
   * The server expects: { type: "move", x, y, z, rotY }
   */
  sendMove(x, y, z, rotY) {
    if (!this.room) return;
    this.room.send({
      type: "move",
      x,
      y,
      z,
      rotY
    });
  }

  sendZoneEnter(zoneId) {
    if (!this.room) return;
    this.room.send({
      type: "zoneEnter",
      zoneId
    });
  }

  sendAction(type, data) {
    if (!this.room) return;
    this.room.send({
      type,
      ...data
    });
  }

  leave() {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
  }
}

export const multiplayerClient = new MultiplayerClient();