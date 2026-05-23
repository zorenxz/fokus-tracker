import { doc } from "firebase/firestore";
import { db } from "../firebase.js";

// ── Date helpers ─────────────────────────────────────────────────────────────

export function daysLeft(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

// ── Firestore helpers ────────────────────────────────────────────────────────

export function docRef(uid, docName = "tasks") {
  return doc(db, "users", uid, "data", docName);
}

// ── Color utilities ──────────────────────────────────────────────────────────

export function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Generate badge bg/text colors from a category's main hex color */
export function getCatStyle(color, isDark = false) {
  const { h, s } = hexToHSL(color);
  if (isDark) {
    return {
      color,
      bg: `hsl(${h}, ${Math.round(s * 0.35)}%, 18%)`,
      text: `hsl(${h}, ${Math.round(s * 0.55)}%, 75%)`,
    };
  }
  return {
    color,
    bg: `hsl(${h}, ${Math.round(s * 0.7)}%, 93%)`,
    text: `hsl(${h}, ${Math.round(s * 0.8)}%, 28%)`,
  };
}

/** Generate a consistent color for a tag based on its name hash */
export function getTagColor(tag, isDark = false) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  if (isDark) {
    return { bg: `hsl(${hue}, 25%, 20%)`, text: `hsl(${hue}, 40%, 75%)` };
  }
  return { bg: `hsl(${hue}, 45%, 92%)`, text: `hsl(${hue}, 55%, 30%)` };
}
