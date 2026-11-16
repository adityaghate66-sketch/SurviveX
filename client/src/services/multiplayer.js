// Multiplayer client service using Colyseus
// Gracefully falls back when client is not available (build mode or SSR)

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
      // Must match the server's Colyseus 0.18 protocol (@colyseus/sdk).
      const { Client } = await import("@colyseus/sdk");
      this.Client = Client;
      this.client = new Client(import.meta.env.VITE_WS_URL || "ws://localhost:4000");
      return true;
    } catch {
      console.warn("[Multiplayer] Colyseus SDK not available, using local mode");
      return false;
    }
  }

  async joinRoom(sessionId, { name, spawnX, spawnZ }) {
    if (!this.Client || !this.client) return null;

    try {
      this.room = await this.client.joinOrCreate("game_room", {
        sessionId,
        name,
        spawnX,
        spawnZ
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

    this.room.onStateChange((state) => {
      if (this.onStateChange) this.onStateChange(state);
    });

    this.room.onMessage("disasterStart", (message) => {
      console.log(`[Multiplayer] Disaster started:`, message);
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
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
  }
}

export const multiplayerClient = new MultiplayerClient();