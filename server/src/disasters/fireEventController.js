// Server-side fire event controller
// Coordinates fire outbreaks across multiplayer sessions

/**
 * Fire Event Controller
 * Manages server-side fire outbreak events for disaster simulation
 */
export class FireEventController {
  constructor() {
    this.activeFires = new Map();
    this.cooldown = 300; // seconds before new fire can start
    this.lastEvent = null;
    this.room = null;
  }

  // Set the room reference for broadcasting
  setRoom(room) {
    this.room = room;
  }

  // Clear all fires (on room dispose)
  clear() {
    this.activeFires.clear();
  }

  // Start a fire at specified location
  triggerFire(roomId, position, { intensity = 0.7, spreadRate = 0.5 } = {}) {
    // Prevent overlapping fires in same area
    const safeToStart = this.canTriggerFire(roomId, position);
    if (!safeToStart) return false;

    const fireId = `fire-${roomId}-${Date.now()}`;

    const fireHazard = {
      id: fireId,
      roomId,
      position,
      intensity,
      spreadRate,
      active: true,
      createdAt: Date.now()
    };

    this.activeFires.set(fireId, fireHazard);
    this.lastEvent = Date.now();

    // Broadcast to all clients in room
    this.broadcastEvent(roomId, {
      type: 'FIRE_START',
      fireId,
      position,
      intensity
    });

    return fireId;
  }

  // Check if location is safe for new fire
  canTriggerFire(roomId, position, radius = 5) {
    for (const fire of this.activeFires.values()) {
      if (fire.roomId !== roomId) continue;

      const dist = Math.sqrt(
        Math.pow(position.x - fire.position.x, 2) +
        Math.pow(position.z - fire.position.z, 2)
      );

      if (dist < radius) return false;
    }
    return true;
  }

  // Broadcast event to all clients in room
  broadcastEvent(roomId, event) {
    if (this.room && this.room.broadcast) {
      this.room.broadcast("disasterEvent", event);
    }
    console.log(`[FireEvent] Broadcasting to room ${roomId}:`, event);
  }

  // Simulate natural fire spread to clients
  simulateSpread(roomId, deltaTime) {
    for (const fire of this.activeFires.values()) {
      if (fire.roomId !== roomId || !fire.active) continue;

      // Update spread probability based on time
      const spreadChance = fire.spreadRate * deltaTime;
      if (Math.random() < spreadChance) {
        this.spreadFire(fire);
      }
    }
  }

  spreadFire(fire) {
    // Broadcast new fire location to clients
    this.broadcastEvent(fire.roomId, {
      type: 'FIRE_SPREAD',
      fireId: fire.id,
      newPosition: this.calculateNewPosition(fire.position)
    });
  }

  calculateNewPosition(currentPosition) {
    // Simple random spread in a cone pattern
    const angle = (Math.random() - 0.5) * Math.PI * 0.5;
    const distance = Math.random() * 2 + 1;
    return {
      x: currentPosition.x + Math.cos(angle) * distance,
      z: currentPosition.z + Math.sin(angle) * distance
    };
  }

  // Extinguish fire from server (when player uses extinguisher)
  extinguishFire(fireId, strength) {
    const fire = this.activeFires.get(fireId);
    if (!fire) return false;

    fire.intensity -= strength * 0.3;

    if (fire.intensity <= 0) {
      this.activeFires.delete(fireId);
      this.broadcastEvent(fire.roomId, {
        type: 'FIRE_OUT',
        fireId
      });
      return true;
    }

    return false;
  }

  // Get all active fires for a room
  getActiveFires(roomId) {
    return Array.from(this.activeFires.values())
      .filter(f => f.roomId === roomId && f.active);
  }

  // Clean up old fires when session ends
  cleanupRoomFires(roomId) {
    for (const [fireId, fire] of this.activeFires.entries()) {
      if (fire.roomId === roomId) {
        this.broadcastEvent(roomId, {
          type: 'FIRE_CLEARED',
          fireId
        });
        this.activeFires.delete(fireId);
      }
    }
  }
}

// Export singleton instance
export const fireEventController = new FireEventController();