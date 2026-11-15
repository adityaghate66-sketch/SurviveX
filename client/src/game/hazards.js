// Hazards system for SurviveX - fire, smoke, and environmental dangers
import * as THREE from "three";

// Fire hazard state management
export class FireHazard {
  constructor(id, position, { maxSpreadZones = 3, baseIntensity = 1.0 } = {}) {
    this.id = id;
    this.position = position;
    this.maxSpreadZones = maxSpreadZones;
    this.baseIntensity = baseIntensity;

    this.intensity = 1.0;
    this.isSpread = false;
    this.active = true;
    this.coverage = 0; // 0-1 scale of area covered
    this.smokeOpacity = 0.3;
    this.smokeDensity = 0;
  }

  // Reduce fire intensity when extinguished
  extinguish(strength = 1.0) {
    if (!this.active) return false;

    const reduction = strength * 0.5;
    this.intensity = Math.max(0, this.intensity - reduction);

    // Update visual states
    this.updateSmokeState();

    // Fire is fully out when intensity reaches 0
    if (this.intensity <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  updateSmokeState() {
    // Smoke opacity increases with fire intensity
    this.smokeOpacity = THREE.MathUtils.lerp(0.3, 0.8, this.intensity);
    // Smoke density affects visibility
    this.smokeDensity = THREE.MathUtils.lerp(0, 1, this.intensity);
  }

  // Grow fire to adjacent zones
  spread() {
    if (!this.active || this.isSpread) return;

    this.isSpread = true;
    this.coverage = THREE.MathUtils.lerp(0, 0.5, this.intensity);
  }

  // Tick update for natural spread
  update(deltaTime) {
    if (!this.active) return;

    // Gradual natural spread (if active)
    if (!this.isSpread && Math.random() < 0.01 * deltaTime) {
      this.spread();
    }

    // Update coverage based on intensity
    this.coverage = THREE.MathUtils.lerp(0, 0.6, this.intensity);
  }

  getSmokeEffect() {
    return {
      opacity: this.smokeOpacity,
      density: this.smokeDensity,
      coverage: this.coverage
    };
  }

  isExtinguished() {
    return !this.active;
  }

  getIntensity() {
    return this.intensity;
  }
}

// Particle system for smoke effects
export class SmokeParticleSystem {
  constructor({ maxParticles = 500 } = {}) {
    this.maxParticles = maxParticles;
    this.particles = [];
    this.active = false;
    this.sourcePosition = new THREE.Vector3();

    this.initParticles();
  }

  initParticles() {
    // Pre-initialize particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }

  createParticle() {
    return {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: THREE.MathUtils.randFloat(2, 5),
      size: THREE.MathUtils.randFloat(0.1, 0.3),
      opacity: 0,
      active: false
    };
  }

  emit(position, count = 10) {
    this.active = true;
    this.sourcePosition.copy(position);

    const emitted = [];
    for (let i = 0; i < count && this.particles.length > 0; i++) {
      const particle = this.particles.pop();
      particle.active = true;
      particle.life = 0;
      particle.position.copy(position);
      particle.velocity.set(
        THREE.MathUtils.randFloatSpread(0.2),
        THREE.MathUtils.randFloat(0.05, 0.15),
        THREE.MathUtils.randFloatSpread(0.2)
      );
      particle.opacity = 0.5 + Math.random() * 0.3;
      emitted.push(particle);
    }
    return emitted;
  }

  update(deltaTime) {
    if (!this.active) return;

    const gravity = -9.8 * deltaTime * 0.5;
    let activeCount = 0;

    for (const particle of this.particles) {
      if (!particle.active) continue;

      activeCount++;
      particle.life += deltaTime;

      // Update physics
      particle.velocity.y += gravity;
      particle.position.addScaledVector(particle.velocity, deltaTime);

      // Fade out based on life
      const lifeRatio = particle.life / particle.maxLife;
      particle.opacity = Math.max(0, particle.opacity * (1 - deltaTime * 0.5));
      particle.size = THREE.MathUtils.lerp(
        THREE.MathUtils.randFloat(0.1, 0.3),
        0.01,
        lifeRatio
      );

      // Reset expired particles
      if (particle.life >= particle.maxLife) {
        particle.active = false;
        particle.opacity = 0;
        this.particles.push(particle); // Return to pool
      }
    }

    this.active = activeCount > 0;
    return activeCount > 0;
  }

  getActiveParticles() {
    return this.particles.filter(p => p.active);
  }

  reset() {
    for (const particle of this.particles) {
      particle.active = false;
      particle.opacity = 0;
    }
    this.active = false;
  }
}

// Hazards registry for multiple fire sources
export class HazardsRegistry {
  constructor() {
    this.hazards = new Map();
    this.particleSystem = new SmokeParticleSystem();
  }

  addHazard(id, position, options = {}) {
    const hazard = new FireHazard(id, position, options);
    this.hazards.set(id, hazard);
    return hazard;
  }

  getHazard(id) {
    return this.hazards.get(id);
  }

  removeHazard(id) {
    const hazard = this.hazards.get(id);
    if (hazard) {
      hazard.extinguish(999); // Force extinguish
      this.hazards.delete(id);
    }
  }

  update(deltaTime) {
    for (const hazard of this.hazards.values()) {
      hazard.update(deltaTime);
    }
    return this.particleSystem.update(deltaTime);
  }

  extinguishAt(position, radius, strength = 1.0) {
    let anyExtinguished = false;
    for (const hazard of this.hazards.values()) {
      const distance = position.distanceTo(hazard.position);
      if (distance < radius && hazard.active) {
        if (hazard.extinguish(strength)) {
          anyExtinguished = true;
        }
      }
    }
    return anyExtinguished;
  }

  getAllActiveHazards() {
    return Array.from(this.hazards.values()).filter(h => h.active);
  }
}

// Export singleton instance
export const hazardsRegistry = new HazardsRegistry();