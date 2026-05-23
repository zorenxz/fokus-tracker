import { TagInput } from "./TagInput.jsx";
import { STATUS_MAP, PRIOS } from "../lib/constants.js";

const inp = {
  width: "100%", padding: "9px 11px", fontSize: 13,
  border: "1px solid var(--border-input)", borderRadius: "var(--radius-md)",
  background: "var(--bg-input)", color: "var(--text-primary)", boxSizing: "border-box",
};
const labelStyle = { fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4, fontWeight: 500 };

export function TaskForm({ form, setForm, onSave, onCancel, isEdit, categories, allTags }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border-input)",
      borderRadius: "var(--radius-lg)", padding: "1.25rem", marginBottom: "1rem",
      animation: "slideDown 0.2s ease",
    }}>
      <h3 style={{ margin: "0 0 1rem", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
        {isEdit ? "Edit Tugas" : "Tambah Tugas Baru"}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Title */}
        <input type="text" placeholder="Nama tugas..." value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />

        {/* Category + Priority */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Kategori</label>
            <select value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Prioritas</label>
            <select value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inp}>
              {Object.entries(PRIOS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Deadline + Status */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Deadline</label>
            <input type="date" value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inp}>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label style={labelStyle}>Tags</label>
          <TagInput
            tags={form.tags || []}
            onChange={tags => setForm(f => ({ ...f, tags }))}
            allTags={allTags}
          />
        </div>

        {/* Notes */}
        <textarea rows={2} value={form.notes} placeholder="Catatan tambahan... (opsional)"
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          style={{ ...inp, resize: "none", lineHeight: 1.5 }} />

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={onSave} style={{
            flex: 1, padding: 10, fontSize: 13, fontWeight: 600,
            background: "var(--accent)", color: "#fff", border: "none",
            borderRadius: "var(--radius-md)", cursor: "pointer",
          }}>
            {isEdit ? "Simpan Perubahan" : "Tambah Tugas"}
          </button>
          <button onClick={onCancel} style={{
            padding: "10px 18px", fontSize: 13, background: "transparent",
            color: "var(--text-secondary)", border: "1px solid var(--border-input)",
            borderRadius: "var(--radius-md)", cursor: "pointer",
          }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
