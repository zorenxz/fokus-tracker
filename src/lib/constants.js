// ── Static Constants ─────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES = [
  { id: "kuliah",     label: "Kuliah",     color: "#1D9E75" },
  { id: "klien",      label: "Klien",      color: "#378ADD" },
  { id: "organisasi", label: "Organisasi", color: "#7F77DD" },
];

export const PRIOS = {
  tinggi: {
    label: "Tinggi",
    light: { bg: "#FAECE7", text: "#993C1D" },
    dark:  { bg: "#3D1F14", text: "#F5A589" },
  },
  sedang: {
    label: "Sedang",
    light: { bg: "#FAEEDA", text: "#854F0B" },
    dark:  { bg: "#352A0F", text: "#F5D57A" },
  },
  rendah: {
    label: "Rendah",
    light: { bg: "#EAF3DE", text: "#3B6D11" },
    dark:  { bg: "#1A2E0F", text: "#A5D67A" },
  },
};

export const STATUS_MAP = {
  belum: {
    label: "Belum Mulai",
    light: { bg: "#f1efe8", text: "#5f5e5a" },
    dark:  { bg: "#2a2922", text: "#a5a49d" },
  },
  proses: {
    label: "Dalam Proses",
    light: { bg: "#E6F1FB", text: "#185FA5" },
    dark:  { bg: "#122640", text: "#7BB5F0" },
  },
  selesai: {
    label: "Selesai",
    light: { bg: "#EAF3DE", text: "#3B6D11" },
    dark:  { bg: "#1A2E0F", text: "#A5D67A" },
  },
};

export const PRESET_COLORS = [
  "#1D9E75", "#378ADD", "#7F77DD", "#D85A30", "#BA7517",
  "#A32D2D", "#2D8EA3", "#E85D9B", "#6366F1", "#059669",
];

export const EMPTY_TASK = {
  title: "",
  category: "",
  priority: "sedang",
  deadline: "",
  status: "belum",
  notes: "",
  tags: [],
};

export const MAX_CATEGORIES = 8;
export const MAX_TAGS_PER_TASK = 5;
