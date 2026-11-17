// Multiplayer client service using Colyseus SDK 0.18
// Must match server's colyseus version exactly

const IsBrowser = typeof window !== "undefined";

function toWsUrl(url) {
  return url.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

// Resolve the Colyseus endpoint. Env vars are baked in at BUILD time, so a
// deployed frontend must set VITE_WS_URL (and VITE_API_BASE_URL) and rebuild.
// With no env vars, derive it from the page itself: on localhost that gives
// ws://localhost:4000, and on a LAN dev server it gives ws://<your-ip>:4000.
function resolveWsUrl() {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) return toWsUrl(explicit);

  const api = import.meta.env.VITE_API_BASE_URL;
  // "/api" is the Vite dev proxy — it is not a usable WebSocket host.
  if (api && /^https?:\/\//.test(api)) {
    return toWsUrl(api.replace(/\/api\/?$/, ""));
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:4000`;
}

class MultiplayerClient {
  constructor() {
    this.client = null;
    this.room = null;
    this.onStateChange = null;
  }

  async initialize() {
    if (!IsBrowser) return false;

    try {
      const { Client } = await import("@colyseus/sdk");
      this.Client = Client;
      const wsUrl = resolveWsUrl();
      console.log("[Multiplayer] Connecting to", wsUrl);
      this.client = new Client(wsUrl);
      return true;
    } catch (e) {
      console.warn("[Multiplayer] @colyseus/sdk not available, using local mode");
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
        spawnZ,
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

    this.room.onMessage("playerJoined", (message) => {
      console.log(`[Multiplayer] playerJoined:`, message);
    });

    this.room.onMessage("playerLeft", (message) => {
      console.log(`[Multiplayer] playerLeft:`, message);
    });
  }

  /**
   * Send player movement to server
   * Uses Colyseus SDK format: room.send(type, payload)
   */
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