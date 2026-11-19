// Building type definitions for Coastal District 001
// Phase 3: Buildings and Architecture
//
// This module defines building styles and materials for Goa-inspired architecture:
// - Beachfront: Portuguese colonial, pastel colors
// - Harbour: Industrial, functional
// - Town centre: Colorful commercial buildings
// - Residential: Portuguese colonial, modern Indian

// Portuguese Colonial Style (common in Goa)
export const PORTUGUESE_COLONIAL = {
  baseColor: "#cd853f",  // SaddleBrown
  roofColor: "#8b4513",  // SaddleBrown
  accentColor: "#f5deb3",  // Wheat
  wallThickness: 0.5,
  columnRadius: 0.2,
  balconyDepth: 0.6,
};

// Tropical Modernist Style
export const TROPICAL_MODERN = {
  baseColor: "#e0c097",  // Light beige
  roofColor: "#2f4f4f",  // DarkSlateGray
  accentColor: "#ff6347",  // Tomato (terracotta)
  wallThickness: 0.4,
};

// Goan Church Style (for important buildings)
export const GOAN_CHURCH = {
  baseColor: "#f5f5dc",  // Beige
  roofColor: "#8b0000",  // DarkRed
  accentColor: "#daa520",  // GoldenBrown
  domeRadius: 3,
  bellTowerHeight: 8,
};

// Harbour Industrial Style
export const HARBOR_INDUSTRIAL = {
  baseColor: "#696969",  // DimGray
  roofColor: "#2f4f4f",  // DarkSlateGray
  accentColor: "#4169e1",  // RoyalBlue (harbour signage)
  metalness: 0.4,
  roughness: 0.6,
};

// Residential Portuguese Style
export const RESIDENTIAL_PORTUGUESE = {
  baseColor: "#d2b48c",  // Tan
  roofColor: "#a0522d",  // Sienna
  accentColor: "#deb887",  // BurlyWood
  balconyRailColor: "#8b4513",
};

// Tropical Resort Style (hotels/beachfront)
export const TROPICAL_RESORT = {
  baseColor: "#f4a460",  // SandyBrown
  roofColor: "#cd853f",  // Peru
  accentColor: "#20b2aa",  // LightSeaGreen
  whiteTrim: true,
};

// Commercial Market Style
export const COMMERCIAL_MARKET = {
  baseColor: "#ff6347",  // Tomato
  roofColor: "#ffd700",  // Gold
  accentColor: "#32cd32",  // LimeGreen
  colorful: true,  // Will randomize accent colors
};

// Utility to get random color variant
export function getRandomVariant(baseColor, variance = 0.15) {
  const hsl = new THREE.Color(baseColor);
  const { h, s, l } = hsl.getHSL();

  // Add slight variation to saturation and lightness
  const newS = THREE.MathUtils.clamp(s + (Math.random() - 0.5) * variance, 0, 1);
  const newL = THREE.MathUtils.clamp(l + (Math.random() - 0.5) * variance, 0, 1);

  return new THREE.Color().setHSL(h, newS, newL);
}

// Import THREE for color operations
import * as THREE from "three";