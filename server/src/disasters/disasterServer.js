// Main disaster server controller - coordinates all disaster events
import { fireEventController } from "./fireEventController.js";

export class DisasterServer {
  constructor() {
    this.room = null;
    this.activeDisaster = null;
    this.disasterTimer = null;
  }

  // Set the room reference
  setRoom(room) {
    this.room = room;
  }

  // Trigger a disaster event (from client or randomly)
  triggerFromClient(type) {
    console.log(`[DisasterServer] Client-triggered ${type} disaster`);
    this.triggerDisaster(type);
  }

  // Trigger a disaster event
  triggerDisaster(type, params = {}) {
    if (!this.room) return;

    const validTypes = ["earthquake", "fire"];
    if (!validTypes.includes(type)) {
      console.warn(`[DisasterServer] Invalid disaster type: ${type}`);
      return;
    }

    this.activeDisaster = {
      type,
      startTime: Date.now(),
      duration: params.duration || 30000, // 30 seconds by default
      ...params
    };

    // Broadcast to all clients
    this.room.broadcast("disasterStart", {
      type,
      startTime: this.activeDisaster.startTime,
      duration: this.activeDisaster.duration
    });

    console.log(`[DisasterServer] Triggered ${type} disaster`);

    // Auto-end the disaster
    if (this.activeDisaster.duration > 0) {
      setTimeout(() => {
        this.endDisaster();
      }, this.activeDisaster.duration);
    }
  }

  // End current disaster
  endDisaster() {
    if (!this.activeDisaster || !this.room) return;

    const type = this.activeDisaster.type;
    console.log(`[DisasterServer] Ending ${type} disaster`);

    this.room.broadcast("disasterEnd", { type });

    // Cleanup type-specific state
    if (type === "fire") {
      fireEventController.cleanupRoomFires(this.room.state?.sessionId || "unknown");
    }

    this.activeDisaster = null;
  }

  // Handle fire extinguisher interaction
  extinguishFire(fireId, strength) {
    const extinguished = fireEventController.extinguishFire(fireId, strength);
    if (extinguished) {
      this.room?.broadcast("fireExtinguished", { fireId });
    }
    return extinguished;
  }

  // Get current disaster state
  getState() {
    return this.activeDisaster;
  }

  // Cleanup on room dispose
  clear() {
    this.activeDisaster = null;
    clearTimeout(this.disasterTimer);

    if (fireEventController) {
      fireEventController.clear();
    }
  }
}

// Export singleton instance
export const disasterServer = new DisasterServer();