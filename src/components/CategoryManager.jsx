import { useState } from "react";
import { useTheme } from "../hooks/useTheme.jsx";
import { PRESET_COLORS, MAX_CATEGORIES } from "../lib/constants.js";
import { getCatStyle } from "../lib/utils.js";

const inp = {
  width: "100%", padding: "9px 11px", fontSize: 13,
  border: "1px solid var(--border-input)", borderRadius: "var(--radius-md)",
  background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box",
};

export function CategoryManager({ categories, onSave, onClose }) {
  const [cats, setCats] = useState(categories);
  const [editId, setEditId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
  const { isDark } = useTheme();

  function startEdit(cat) {
    setEditId(cat.id);
    setEditLabel(cat.label);
    setEditColor(cat.color);
  }

  function saveEdit() {
    if (!editLabel.trim()) return;
    setCats(prev => prev.map(c =>
      c.id === editId ? { ...c, label: editLabel.trim(), color: editColor } : c
    ));
    setEditId(null);
  }

  function addCategory() {
    if (cats.length >= MAX_CATEGORIES) return;
    const id = "cat_" + Date.now();
    const newCat = { id, label: "Kategori Baru", color: PRESET_COLORS[cats.length % PRESET_COLORS.length] };
    setCats(prev => [...prev, newCat]);
    startEdit(newCat);
  }

  function deleteCategory(id) {
    if (cats.length <= 1) return;
    setCats(prev => prev.filter(c => c.id !== id));
    if (editId === id) setEditId(null);
  }

  function handleSave() {
    onSave(cats);
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Kelola Kategori</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 18, color: "var(--text-secondary)",
            cursor: "pointer", padding: 4,
          }}>✕</button>
        </div>

        {/* Category list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1rem" }}>
          {cats.map(cat => {
            const isEditing = editId === cat.id;

            if (isEditing) {
              return (
                <div key={cat.id} style={{
                  padding: 12, background: "var(--bg-hover)", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)", animation: "fadeIn 0.15s ease",
                }}>
                  <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                    style={{ ...inp, marginBottom: 8 }}
                    placeholder="Nama kategori..."
                    autoFocus
                    onKeyDown={e => e.key === "Enter" && saveEdit()}
                  />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => setEditColor(c)}
                        className={`color-preset ${editColor === c ? "active" : ""}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={saveEdit} style={{
                      flex: 1, padding: "6px 12px", fontSize: 12, fontWeight: 600,
                      background: "var(--accent)", color: "#fff", border: "none",
                      borderRadius: "var(--radius-sm)", cursor: "pointer",
                    }}>Simpan</button>
                    <button onClick={() => setEditId(null)} style={{
                      padding: "6px 12px", fontSize: 12, background: "transparent",
                      color: "var(--text-secondary)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", cursor: "pointer",
                    }}>Batal</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={cat.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", borderLeft: `4px solid ${cat.color}`,
                transition: "background 0.15s ease",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: "var(--text-primary)" }}>
                  {cat.label}
                </span>
                <button onClick={() => startEdit(cat)} style={{
                  background: "none", border: "1px solid var(--border)", borderRadius: 6,
                  padding: "3px 8px", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer",
                }}>Edit</button>
                {cats.length > 1 && (
                  <button onClick={() => deleteCategory(cat.id)} style={{
                    background: "none", border: "1px solid var(--border)", borderRadius: 6,
                    padding: "3px 8px", fontSize: 11, color: "var(--danger)", cursor: "pointer",
                  }}>Hapus</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add button */}
        {cats.length < MAX_CATEGORIES && (
          <button onClick={addCategory} style={{
            width: "100%", padding: 8, fontSize: 12, fontWeight: 500,
            background: "var(--bg-hover)", color: "var(--text-secondary)",
            border: "1px dashed var(--border-input)", borderRadius: "var(--radius-md)",
            cursor: "pointer", marginBottom: "1rem",
          }}>
            + Tambah Kategori ({cats.length}/{MAX_CATEGORIES})
          </button>
        )}

        {/* Save all */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSave} style={{
            flex: 1, padding: 10, fontSize: 13, fontWeight: 600,
            background: "var(--accent)", color: "#fff", border: "none",
            borderRadius: "var(--radius-md)", cursor: "pointer",
          }}>Simpan Semua</button>
          <button onClick={onClose} style={{
            padding: "10px 18px", fontSize: 13, background: "transparent",
            color: "var(--text-secondary)", border: "1px solid var(--border-input)",
            borderRadius: "var(--radius-md)", cursor: "pointer",
          }}>Batal</button>
        </div>
      </div>
    </div>
  );
}
