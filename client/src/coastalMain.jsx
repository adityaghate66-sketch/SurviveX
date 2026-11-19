// Standalone preview entry for Coastal District 001.
//
// This is a development viewport, not the game entry point. index.html still
// boots the classroom exactly as before; this page exists so the coastal
// environment can be inspected and tested without touching App.jsx.
// Player/multiplayer integration belongs to Phase 6.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CoastalDistrict from "./scenes/CoastalDistrict/CoastalDistrict.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CoastalDistrict debugCamera showBounds debugStats />
  </StrictMode>
);
