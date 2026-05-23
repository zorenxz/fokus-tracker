import { useTheme } from "../hooks/useTheme.jsx";
import { getCatStyle } from "../lib/utils.js";

export function ProgressBar({ tasks, categories }) {
  const { isDark } = useTheme();
  const total = tasks.length;
  if (total === 0) return null;

  const done = tasks.filter(t => t.status === "selesai").length;
  const pct = Math.round((done / total) * 100);

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {/* Overall progress */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>
          Progress keseluruhan
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>
          {done}/{total} ({pct}%)
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, var(--accent), ${isDark ? '#4ade80' : '#34d399'})`,
        }} />
      </div>

      {/* Per-category mini bars */}
      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
        {categories.map(cat => {
          const catTasks = tasks.filter(t => t.category === cat.id);
          if (catTasks.length === 0) return null;
          const catDone = catTasks.filter(t => t.status === "selesai").length;
          const catPct = Math.round((catDone / catTasks.length) * 100);
          const style = getCatStyle(cat.color, isDark);
          return (
            <div key={cat.id} style={{ flex: 1, minWidth: 80 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: style.text, fontWeight: 600 }}>{cat.label}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{catDone}/{catTasks.length}</span>
              </div>
              <div className="progress-track" style={{ height: 4 }}>
                <div className="progress-fill" style={{ width: `${catPct}%`, background: cat.color, height: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
