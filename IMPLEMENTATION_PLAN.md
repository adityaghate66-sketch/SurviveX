# SurviveX - Next Implementation Plan

## Immediate Milestones (Next 2-3 Days)

### 1. Active Hazard System (Fire Simulation)
**Files to modify/create:**
- `client/src/game/hazards.js` - New hazard management
- `client/src/game/fireSpread.js` - Fire propagation logic
- `client/src/components/ParticleSystem.jsx` - Smoke/flickering effects
- `client/src/scenes/Classroom.jsx` - Add fire hazard mesh with trigger zone
- `client/src/components/FireHazard.jsx` - Interactive fire entity component
- `server/src/disasters/fireEventController.js` - Server-side fire event scheduling

**Features:**
- Fire outbreak in hallway classroom area
- Fire spread algorithm (proximity + wind factors)
- Smoke particles using Three.js
- Fire intensity states (smoldering → active → spreading)
- Fire extinguisher interaction (dampens flame for X seconds)
- Heat distortion visual effect

---

### 2. Multiplayer Infrastructure
**Files to modify/create:**
- `server/src/multiplayer/roomManager.js` - Colyseus room creation
- `server/src/multiplayer/playerStateSchema.js` - Shared state schema
- `client/src/services/multiplayer.js` - WebSocket/Colyseus client
- `client/src/components/PlayerAvatar.jsx` - Network avatar with interpolation
- `client/src/components/AvatarManager.jsx` - Manages spawned players
- `server/src/disasters/disasterServer.js` - Broadcast disaster events to all clients
- `server/src/controllers/multiplayerController.js` - Handle player join/leave

**Features:**
- 5-10 player shared rooms with lobby
- Real-time player position synchronization
- Disaster events broadcast to all room members
- Player join/leave notifications
- Avatar rendering with smooth interpolation

---

### 3. UI Feedback & Action Prompts
**Files to modify/create:**
- `client/src/components/Hud.jsx` - Central HUD component
- `client/src/components/ActionPrompt.jsx` - Contextual key prompt (E, F, C)
- `client/src/components/FireExtinguisherUI.jsx` - Ammo counter display
- `client/src/components/SmokeUI.jsx` - Visibility indicator

**Features:**
- On-screen prompt: "Press [F] to Pick Up Fire Extinguisher"
- On-screen prompt: "Press [C] to Take Cover"
- Fire extinguisher ammo counter
- Smoke visibility percentage
- Disaster phase banner with countdown

---

### 4. Performance & Asset Optimization
**Files to modify:**
- `client/src/scenes/classroomLayout.js` - Optimize geometry, merge meshes
- `client/src/assets/models/` - LOD versions of furniture
- `server/src/config/performance.js` - Rate limiting for updates

**Features:**
- Merge static geometry (floors, walls) into single meshes
- Add LOD system for furniture props
- Compress texture atlases
- Implement object pooling for particles

---

## Testing & QA
- Test multiplayer connectivity (different browsers)
- Verify disaster sync timing
- Check performance with 10 players in room
- Validate fire spread algorithm accuracy