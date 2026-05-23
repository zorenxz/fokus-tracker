import { useTheme } from "../hooks/useTheme.jsx";
import { getCatStyle, getTagColor, daysLeft } from "../lib/utils.js";
import { PRIOS, STATUS_MAP } from "../lib/constants.js";

// ── Sub-components ───────────────────────────────────────────────────────────

function Badge({ bg, text, children, onClick, title }) {
  return (
    <span onClick={onClick} title={title} style={{
      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
      background: bg, color: text, cursor: onClick ? "pointer" : "default",
      userSelect: "none", whiteSpace: "nowrap",
      transition: "filter 0.15s ease",
    }}>
      {children}
    </span>
  );
}

function DeadlineText({ deadline }) {
  const d = daysLeft(deadline);
  if (d === null) return null;
  const s = { fontSize: 11, fontWeight: 600 };
  if (d < 0)   return <span style={{ ...s, color: "var(--danger)" }}>Terlewat {Math.abs(d)} hari</span>;
  if (d === 0) return <span style={{ ...s, color: "#D85A30" }}>Hari ini!</span>;
  if (d <= 3)  return <span style={{ ...s, color: "#BA7517" }}>{d} hari lagi</span>;
  return <span style={{ ...s, color: "var(--text-muted)" }}>{d} hari lagi</span>;
}

// ── Shared styles ────────────────────────────────────────────────────────────

const btnSm = {
  background: "none", border: "1px solid var(--border)", borderRadius: 8,
  padding: "4px 10px", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer",
  transition: "all 0.15s ease",
};

// ── TaskCard ─────────────────────────────────────────────────────────────────

export function TaskCard({ task, category, onEdit, onDelete, onCycle, animDelay = 0 }) {
  const { isDark } = useTheme();
  const catStyle = category
    ? getCatStyle(category.color, isDark)
    : { bg: "var(--bg-hover)", text: "var(--text-secondary)", color: "#888" };

  const prio = PRIOS[task.priority];
  const st = STATUS_MAP[task.status];
  const prioC = isDark ? prio.dark : prio.light;
  const stC = isDark ? st.dark : st.light;

  return (
    <div className="task-card" style={{
      borderLeft: `4px solid ${category?.color || "#888"}`,
      opacity: task.status === "selesai" ? 0.55 : 1,
      animationDelay: `${animDelay * 40}ms`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 7 }}>
            <Badge bg={catStyle.bg} text={catStyle.text}>{category?.label || "—"}</Badge>
            <Badge bg={prioC.bg} text={prioC.text}>{prio.label}</Badge>
            <Badge bg={stC.bg} text={stC.text} onClick={() => onCycle(task.id)} title="Klik untuk ubah status">
              {st.label}
            </Badge>
          </div>

          {/* Title */}
          <p style={{
            margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
            textDecoration: task.status === "selesai" ? "line-through" : "none",
          }}>
            {task.title}
          </p>

          {/* Notes */}
          {task.notes && (
            <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {task.notes}
            </p>
          )}

          {/* Tags */}
          {task.tags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, margin: "5px 0" }}>
              {task.tags.map(tag => {
                const c = getTagColor(tag, isDark);
                return (
                  <span key={tag} className="tag-pill" style={{ background: c.bg, color: c.text }}>
                    #{tag}
                  </span>
                );
              })}
            </div>
          )}

          {/* Deadline */}
          {task.deadline && (
            <p style={{ margin: "5px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {new Date(task.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <DeadlineText deadline={task.deadline} />
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          <button onClick={() => onEdit(task)} style={btnSm}>Edit</button>
          <button onClick={() => onDelete(task.id)} style={{ ...btnSm, color: "var(--danger)" }}>Hapus</button>
        </div>
      </div>
    </div>
  );
}
