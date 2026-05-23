import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { auth, provider } from "./firebase.js";
import { setDoc, onSnapshot } from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

import { useTheme } from "./hooks/useTheme.jsx";
import { useCategories } from "./hooks/useCategories.jsx";
import { PRIOS, STATUS_MAP, EMPTY_TASK } from "./lib/constants.js";
import { daysLeft, docRef, getCatStyle } from "./lib/utils.js";

import { ThemeToggle } from "./components/ThemeToggle.jsx";
import { SearchBar } from "./components/SearchBar.jsx";
import { ProgressBar } from "./components/ProgressBar.jsx";
import { TaskCard } from "./components/TaskCard.jsx";
import { TaskForm } from "./components/TaskForm.jsx";
import { CategoryManager } from "./components/CategoryManager.jsx";

// ── Toast system ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "var(--danger-bg, #fef2f2)" : t.type === "warn" ? "var(--warn-bg, #fffbeb)" : "var(--success-bg, #f0fdf4)",
          border: `1px solid ${t.type === "error" ? "#fca5a5" : t.type === "warn" ? "#fcd34d" : "#86efac"}`,
          color: t.type === "error" ? "#dc2626" : t.type === "warn" ? "#d97706" : "#16a34a",
          padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          boxShadow: "var(--shadow-md)",
          animation: "slideIn 0.2s ease",
          pointerEvents: "none",
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, add };
}

// ── Browser notifications ────────────────────────────────────────────────────

async function requestNotifPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function checkDeadlineNotifs(tasks, categories) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const active = tasks.filter(t => t.status !== "selesai" && t.deadline);
  active.forEach(task => {
    const d = daysLeft(task.deadline);
    const cat = categories.find(c => c.id === task.category);
    if (d === 0) {
      new Notification("⏰ Deadline Hari Ini!", { body: `${task.title} (${cat?.label || ""})`, tag: task.id + "-0" });
    } else if (d === 1) {
      new Notification("📅 Deadline Besok", { body: `${task.title} (${cat?.label || ""})`, tag: task.id + "-1" });
    }
  });
}

// ── Deadline Alert Banner ────────────────────────────────────────────────────

function DeadlineAlerts({ tasks, categories }) {
  const { isDark } = useTheme();
  const urgent = tasks.filter(t => {
    if (t.status === "selesai") return false;
    const d = daysLeft(t.deadline);
    return d !== null && d <= 2;
  }).sort((a, b) => daysLeft(a.deadline) - daysLeft(b.deadline));

  if (urgent.length === 0) return null;

  return (
    <div style={{
      background: isDark ? "#2d2610" : "#fffbeb",
      border: `1px solid ${isDark ? "#8a6d1b" : "#fcd34d"}`,
      borderRadius: 12, padding: "12px 14px", marginBottom: "1rem",
    }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#f5d57a" : "#92400e", marginBottom: 6 }}>
        {urgent.length} tugas mendesak
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {urgent.map(t => {
          const cat = categories.find(c => c.id === t.category);
          return (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat?.color || "#888", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: isDark ? "#f5d57a" : "#78350f", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.title}
              </span>
              <DeadlineSmall deadline={t.deadline} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeadlineSmall({ deadline }) {
  const d = daysLeft(deadline);
  if (d === null) return null;
  const s = { fontSize: 11, fontWeight: 600 };
  if (d < 0)   return <span style={{ ...s, color: "var(--danger)" }}>Terlewat {Math.abs(d)} hari</span>;
  if (d === 0) return <span style={{ ...s, color: "#D85A30" }}>Hari ini!</span>;
  if (d <= 3)  return <span style={{ ...s, color: "#BA7517" }}>{d} hari lagi</span>;
  return <span style={{ ...s, color: "var(--text-muted)" }}>{d} hari lagi</span>;
}

// ── Google Icon ──────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

// ── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, loading }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ textAlign: "center", maxWidth: 360, width: "100%", animation: "fadeInUp 0.4s ease" }}>
        <div style={{ fontSize: 48, marginBottom: "1rem" }}>🎯</div>
        <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>Fokus Tracker</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: "2rem", lineHeight: 1.6 }}>
          Kelola tugas kuliah, project klien, dan program organisasimu dalam satu tempat.
        </p>
        <button onClick={onLogin} disabled={loading} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          width: "100%", padding: "12px 20px", fontSize: 14, fontWeight: 600,
          background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-input)",
          borderRadius: 12, cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1, boxShadow: "var(--shadow-sm)",
          transition: "box-shadow 0.2s ease, transform 0.15s ease",
        }}>
          <GoogleIcon />
          {loading ? "Menghubungkan..." : "Masuk dengan Google"}
        </button>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: "1.5rem" }}>
          Data tersimpan aman di akun Google kamu
        </p>
      </div>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────

const btnSm = {
  background: "none", border: "1px solid var(--border)", borderRadius: 8,
  padding: "4px 10px", fontSize: 12, color: "var(--text-secondary)", cursor: "pointer",
};

// ── Main Tracker ─────────────────────────────────────────────────────────────

function Tracker({ user, toast }) {
  const { isDark }                       = useTheme();
  const { categories, saveCategories }   = useCategories(user.uid);
  const [tasks, setTasks]                = useState([]);
  const [catFilter, setCatFilter]        = useState("semua");
  const [stFilter, setStFilter]          = useState("semua");
  const [search, setSearch]              = useState("");
  const [showForm, setShowForm]          = useState(false);
  const [form, setForm]                  = useState({ ...EMPTY_TASK, category: categories[0]?.id || "" });
  const [editId, setEditId]              = useState(null);
  const [syncing, setSyncing]            = useState(false);
  const [loaded, setLoaded]              = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [showArchive, setShowArchive]    = useState(false);
  const notifChecked                     = useRef(false);

  // Realtime task listener
  useEffect(() => {
    const ref = docRef(user.uid, "tasks");
    const unsub = onSnapshot(ref, snap => {
      const items = snap.exists() ? (snap.data().items || []) : [];
      setTasks(items);
      setLoaded(true);
    }, err => {
      console.error(err);
      setLoaded(true);
    });
    return unsub;
  }, [user.uid]);

  // Browser notifications on first load
  useEffect(() => {
    if (!loaded || notifChecked.current) return;
    notifChecked.current = true;
    requestNotifPermission().then(() => checkDeadlineNotifs(tasks, categories));
  }, [loaded, tasks, categories]);

  // Ensure form.category is valid when categories change
  useEffect(() => {
    if (categories.length && !editId) {
      setForm(f => ({
        ...f,
        category: categories.find(c => c.id === f.category) ? f.category : categories[0].id,
      }));
    }
  }, [categories, editId]);

  // Persist tasks to Firestore
  const persist = useCallback(async (next) => {
    setTasks(next);
    setSyncing(true);
    try {
      await setDoc(docRef(user.uid, "tasks"), { items: next });
    } catch (e) {
      toast("Gagal menyimpan. Coba lagi.", "error");
    } finally {
      setSyncing(false);
    }
  }, [user.uid, toast]);

  // Collect all unique tags for autocomplete
  const allTags = useMemo(() => {
    const set = new Set();
    tasks.forEach(t => (t.tags || []).forEach(tag => set.add(tag)));
    return [...set].sort();
  }, [tasks]);

  function handleSave() {
    if (!form.title.trim()) return;
    if (editId) {
      persist(tasks.map(t => t.id === editId ? { ...form, id: editId, createdAt: t.createdAt } : t));
      toast("Tugas berhasil diperbarui ✓");
      setEditId(null);
    } else {
      persist([...tasks, { ...form, id: Date.now().toString(), createdAt: new Date().toISOString() }]);
      toast("Tugas berhasil ditambahkan ✓");
    }
    setForm({ ...EMPTY_TASK, category: categories[0]?.id || "" });
    setShowForm(false);
  }

  function handleEdit(task) {
    setForm({ ...task, tags: task.tags || [] });
    setEditId(task.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(id) {
    if (!window.confirm("Hapus tugas ini?")) return;
    persist(tasks.filter(t => t.id !== id));
    toast("Tugas dihapus", "warn");
  }

  function handleCycle(id) {
    const order = ["belum", "proses", "selesai"];
    const updated = tasks.map(t => {
      if (t.id !== id) return t;
      const next = order[(order.indexOf(t.status) + 1) % 3];
      toast(`Status → ${STATUS_MAP[next].label}`);
      return { ...t, status: next };
    });
    persist(updated);
  }

  // Filter + sort
  const filtered = tasks
    .filter(t => catFilter === "semua" || t.category === catFilter)
    .filter(t => stFilter === "semua" || t.status === stFilter)
    .filter(t => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.notes || "").toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const p = { tinggi: 0, sedang: 1, rendah: 2 };
      if (p[a.priority] !== p[b.priority]) return p[a.priority] - p[b.priority];
      if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
      return a.deadline ? -1 : 1;
    });

  // Split into active and done
  const activeTasks = filtered.filter(t => t.status !== "selesai");
  const doneTasks = filtered.filter(t => t.status === "selesai");

  const counts = {
    total:   tasks.length,
    urgent:  tasks.filter(t => t.priority === "tinggi" && t.status !== "selesai").length,
    proses:  tasks.filter(t => t.status === "proses").length,
    selesai: tasks.filter(t => t.status === "selesai").length,
  };

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem" }}>
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Memuat data...</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>Fokus Tracker</h1>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Halo, {user.displayName?.split(" ")[0]}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {syncing && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Menyimpan...</span>}
          <ThemeToggle />
          <img src={user.photoURL} alt="" width={32} height={32}
            style={{ borderRadius: "50%", border: "2px solid var(--border)" }} />
          <button onClick={() => signOut(auth)} style={{ ...btnSm, fontSize: 11 }}>Keluar</button>
        </div>
      </div>

      {/* ── Deadline Alerts ─────────────────────────────────────────────── */}
      <DeadlineAlerts tasks={tasks} categories={categories} />

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8, marginBottom: "1rem" }}>
        {[
          { label: "Total",        value: counts.total,   color: "var(--text-primary)" },
          { label: "Prioritas ↑",  value: counts.urgent,  color: "#D85A30" },
          { label: "Dalam Proses", value: counts.proses,  color: isDark ? "#7BB5F0" : "#185FA5" },
          { label: "Selesai",      value: counts.selesai, color: isDark ? "#A5D67A" : "#3B6D11" },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "10px 12px",
            transition: "background 0.2s ease, border-color 0.2s ease",
          }}>
            <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>{s.label}</p>
            <p style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 600, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Progress Bar ────────────────────────────────────────────────── */}
      <ProgressBar tasks={tasks} categories={categories} />

      {/* ── Search Bar ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "0.75rem" }}>
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* ── Category Filter + Buttons ───────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
        {[{ id: "semua", label: "Semua", color: null }, ...categories].map(c => {
          const active = catFilter === c.id;
          const catStyle = c.color ? getCatStyle(c.color, isDark) : null;
          return (
            <button key={c.id} onClick={() => setCatFilter(c.id)} style={{
              padding: "5px 14px", fontSize: 12, borderRadius: 999, cursor: "pointer", fontWeight: active ? 600 : 400,
              border: active && catStyle ? `1.5px solid ${c.color}` : active ? "1.5px solid var(--text-primary)" : "1px solid var(--border-input)",
              background: active && catStyle ? catStyle.bg : active ? "var(--bg-hover)" : "transparent",
              color: active && catStyle ? catStyle.text : active ? "var(--text-primary)" : "var(--text-secondary)",
              transition: "all 0.15s ease",
            }}>
              {c.label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowCatManager(true)} style={{ ...btnSm, fontSize: 11, padding: "5px 10px" }}
          title="Kelola Kategori">
          ⚙
        </button>
        <button onClick={() => { setForm({ ...EMPTY_TASK, category: categories[0]?.id || "" }); setEditId(null); setShowForm(v => !v); }} style={{
          padding: "6px 16px", fontSize: 12, fontWeight: 600,
          background: showForm && !editId ? "var(--bg-hover)" : "var(--accent)",
          color: showForm && !editId ? "var(--text-secondary)" : "#fff",
          border: "none", borderRadius: 10, cursor: "pointer",
          transition: "all 0.15s ease",
        }}>
          {showForm && !editId ? "✕ Tutup" : "+ Tambah"}
        </button>
      </div>

      {/* ── Status Filter ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 5, marginBottom: "1rem", flexWrap: "wrap" }}>
        {[
          { key: "semua",   label: "Semua" },
          { key: "belum",   label: "Belum Mulai" },
          { key: "proses",  label: "Dalam Proses" },
          { key: "selesai", label: "Selesai" },
        ].map(s => {
          const active = stFilter === s.key;
          return (
            <button key={s.key} onClick={() => setStFilter(s.key)} style={{
              padding: "4px 12px", fontSize: 11, borderRadius: 999, cursor: "pointer",
              border: active ? "1px solid var(--text-primary)" : "1px solid var(--border-input)",
              background: active ? "var(--text-primary)" : "transparent",
              color: active ? "var(--bg-primary)" : "var(--text-secondary)",
              fontWeight: active ? 500 : 400,
              transition: "all 0.15s ease",
            }}>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* ── Task Form ───────────────────────────────────────────────────── */}
      {showForm && (
        <TaskForm
          form={form} setForm={setForm} onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditId(null); setForm({ ...EMPTY_TASK, category: categories[0]?.id || "" }); }}
          isEdit={!!editId} categories={categories} allTags={allTags}
        />
      )}

      {/* ── Active Tasks ────────────────────────────────────────────────── */}
      {activeTasks.length === 0 && doneTasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {tasks.length === 0 ? 'Belum ada tugas. Klik "+ Tambah" untuk mulai!' : "Tidak ada tugas dengan filter ini."}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {activeTasks.map((task, i) => (
              <TaskCard
                key={task.id} task={task}
                category={categories.find(c => c.id === task.category)}
                onEdit={handleEdit} onDelete={handleDelete} onCycle={handleCycle}
                animDelay={i}
              />
            ))}
          </div>

          {/* ── Archive Section (Selesai) ──────────────────────────────── */}
          {doneTasks.length > 0 && (
            <div style={{ marginTop: activeTasks.length > 0 ? "1rem" : 0 }}>
              <button className="archive-toggle" onClick={() => setShowArchive(v => !v)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showArchive ? "rotate(90deg)" : "rotate(0deg)" }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                {doneTasks.length} tugas selesai
              </button>
              {showArchive && (
                <div style={{ display: "flex", flexDirection: "column", gap: 7, animation: "fadeIn 0.2s ease" }}>
                  {doneTasks.map((task, i) => (
                    <TaskCard
                      key={task.id} task={task}
                      category={categories.find(c => c.id === task.category)}
                      onEdit={handleEdit} onDelete={handleDelete} onCycle={handleCycle}
                      animDelay={i}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={{ marginTop: "2.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.02em" }}>
          Klik badge status untuk mengubah
        </p>
        <p style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6, letterSpacing: "0.05em" }}>
          Fokus Tracker v1.1 (yes with &quot;k&quot;)
        </p>
      </footer>

      {/* ── Category Manager Modal ──────────────────────────────────────── */}
      {showCatManager && (
        <CategoryManager
          categories={categories}
          onSave={saveCategories}
          onClose={() => setShowCatManager(false)}
        />
      )}
    </div>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]                 = useState(null);
  const [authLoading, setAuthLoading]   = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const { toasts, add: toast }          = useToast();

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  async function handleLogin() {
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
      toast("Login gagal. Coba lagi.", "error");
    } finally {
      setLoginLoading(false);
    }
  }

  if (authLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Memuat...</p>
    </div>
  );

  return (
    <>
      {user
        ? <Tracker user={user} toast={toast} />
        : <LoginScreen onLogin={handleLogin} loading={loginLoading} />
      }
      <ToastContainer toasts={toasts} />
    </>
  );
}
