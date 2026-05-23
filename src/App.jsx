import { useState, useEffect, useCallback, useRef } from "react";
import { db, auth, provider } from "./firebase.js";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// ── Konstanta ────────────────────────────────────────────────────────────────

const CATS = {
  kuliah:     { label: "Kuliah",      color: "#1D9E75", bg: "#E1F5EE", text: "#085041" },
  klien:      { label: "Klien",       color: "#378ADD", bg: "#E6F1FB", text: "#0C447C" },
  organisasi: { label: "Organisasi",  color: "#7F77DD", bg: "#EEEDFE", text: "#3C3489" },
};
const PRIOS = {
  tinggi: { label: "Tinggi", bg: "#FAECE7", text: "#993C1D" },
  sedang: { label: "Sedang", bg: "#FAEEDA", text: "#854F0B" },
  rendah: { label: "Rendah", bg: "#EAF3DE", text: "#3B6D11" },
};
const STATUS_MAP = {
  belum:   { label: "Belum Mulai",  bg: "#f1efe8", text: "#5f5e5a" },
  proses:  { label: "Dalam Proses", bg: "#E6F1FB", text: "#185FA5" },
  selesai: { label: "Selesai",      bg: "#EAF3DE", text: "#3B6D11" },
};
const EMPTY = { title: "", category: "kuliah", priority: "sedang", deadline: "", status: "belum", notes: "" };

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysLeft(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

function docRef(uid) {
  return doc(db, "users", uid, "data", "tasks");
}

// ── Toast system ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#fef2f2" : t.type === "warn" ? "#fffbeb" : "#f0fdf4",
          border: `1px solid ${t.type === "error" ? "#fca5a5" : t.type === "warn" ? "#fcd34d" : "#86efac"}`,
          color: t.type === "error" ? "#991b1b" : t.type === "warn" ? "#92400e" : "#166534",
          padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          animation: "slideIn 0.2s ease",
          pointerEvents: "none",
        }}>
          {t.msg}
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
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

// ── Browser notifications ─────────────────────────────────────────────────────

async function requestNotifPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function checkDeadlineNotifs(tasks) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const active = tasks.filter(t => t.status !== "selesai" && t.deadline);
  active.forEach(task => {
    const d = daysLeft(task.deadline);
    if (d === 0) {
      new Notification("⏰ Deadline Hari Ini!", { body: `${task.title} (${CATS[task.category]?.label})`, tag: task.id + "-0" });
    } else if (d === 1) {
      new Notification("📅 Deadline Besok", { body: `${task.title} (${CATS[task.category]?.label})`, tag: task.id + "-1" });
    }
  });
}

// ── UI Primitives ─────────────────────────────────────────────────────────────

function Badge({ bg, text, children, onClick, title }) {
  return (
    <span onClick={onClick} title={title} style={{
      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
      background: bg, color: text, cursor: onClick ? "pointer" : "default",
      userSelect: "none", whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function Deadline({ deadline }) {
  const d = daysLeft(deadline);
  if (d === null) return null;
  const s = { fontSize: 11, fontWeight: 600 };
  if (d < 0)   return <span style={{ ...s, color: "#A32D2D" }}>Terlewat {Math.abs(d)} hari</span>;
  if (d === 0) return <span style={{ ...s, color: "#993C1D" }}>Hari ini!</span>;
  if (d <= 3)  return <span style={{ ...s, color: "#BA7517" }}>{d} hari lagi</span>;
  return <span style={{ ...s, color: "#888780" }}>{d} hari lagi</span>;
}

// ── Deadline Alert Banner ─────────────────────────────────────────────────────

function DeadlineAlerts({ tasks }) {
  const urgent = tasks.filter(t => {
    if (t.status === "selesai") return false;
    const d = daysLeft(t.deadline);
    return d !== null && d <= 2;
  }).sort((a, b) => daysLeft(a.deadline) - daysLeft(b.deadline));

  if (urgent.length === 0) return null;

  return (
    <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12, padding: "12px 14px", marginBottom: "1rem" }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#92400e", marginBottom: 6 }}>
        🔔 {urgent.length} tugas mendesak
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {urgent.map(t => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: CATS[t.category]?.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#78350f", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
            <Deadline deadline={t.deadline} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onEdit, onDelete, onCycle }) {
  const cat  = CATS[task.category];
  const prio = PRIOS[task.priority];
  const st   = STATUS_MAP[task.status];
  return (
    <div style={{
      background: "#fff", border: "1px solid #e8e7e0", borderRadius: 14,
      padding: "12px 14px", borderLeft: `4px solid ${cat.color}`,
      opacity: task.status === "selesai" ? 0.5 : 1, transition: "opacity 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 7 }}>
            <Badge bg={cat.bg}  text={cat.text}>{cat.label}</Badge>
            <Badge bg={prio.bg} text={prio.text}>{prio.label}</Badge>
            <Badge bg={st.bg}   text={st.text} onClick={() => onCycle(task.id)} title="Klik untuk ubah status">
              {st.label}
            </Badge>
          </div>
          <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: "#1a1a18", textDecoration: task.status === "selesai" ? "line-through" : "none" }}>
            {task.title}
          </p>
          {task.notes && <p style={{ margin: "0 0 4px", fontSize: 12, color: "#888780", lineHeight: 1.5 }}>{task.notes}</p>}
          {task.deadline && (
            <p style={{ margin: "5px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#888780" }}>
                {new Date(task.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <Deadline deadline={task.deadline} />
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          <button onClick={() => onEdit(task)} style={btnSm}>Edit</button>
          <button onClick={() => onDelete(task.id)} style={{ ...btnSm, color: "#A32D2D" }}>Hapus</button>
        </div>
      </div>
    </div>
  );
}

const btnSm = { background: "none", border: "1px solid #e8e7e0", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#888780", cursor: "pointer" };
const inp = { width: "100%", padding: "9px 11px", fontSize: 13, border: "1px solid #d3d1c7", borderRadius: 10, background: "#fff", color: "#1a1a18", boxSizing: "border-box" };
const labelStyle = { fontSize: 11, color: "#888780", display: "block", marginBottom: 4, fontWeight: 500 };

// ── Task Form ─────────────────────────────────────────────────────────────────

function TaskForm({ form, setForm, onSave, onCancel, isEdit }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #d3d1c7", borderRadius: 14, padding: "1.25rem", marginBottom: "1rem" }}>
      <h3 style={{ margin: "0 0 1rem", fontSize: 15, fontWeight: 600 }}>{isEdit ? "Edit Tugas" : "Tambah Tugas Baru"}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="text" placeholder="Nama tugas..." value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          style={{ ...inp, fontSize: 14, padding: "10px 12px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Kategori</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
              <option value="kuliah">Kuliah</option>
              <option value="klien">Klien</option>
              <option value="organisasi">Organisasi</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Prioritas</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inp}>
              <option value="tinggi">Tinggi</option>
              <option value="sedang">Sedang</option>
              <option value="rendah">Rendah</option>
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Deadline</label>
            <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inp}>
              <option value="belum">Belum Mulai</option>
              <option value="proses">Dalam Proses</option>
              <option value="selesai">Selesai</option>
            </select>
          </div>
        </div>
        <textarea rows={2} value={form.notes} placeholder="Catatan tambahan... (opsional)"
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          style={{ ...inp, resize: "none", lineHeight: 1.5 }} />
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={onSave} style={{ flex: 1, padding: 10, fontSize: 13, fontWeight: 600, background: "#1D9E75", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" }}>
            {isEdit ? "Simpan Perubahan" : "Tambah Tugas"}
          </button>
          <button onClick={onCancel} style={{ padding: "10px 18px", fontSize: 13, background: "transparent", color: "#888780", border: "1px solid #d3d1c7", borderRadius: 10, cursor: "pointer" }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin, loading }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ textAlign: "center", maxWidth: 360, width: "100%" }}>
        <div style={{ fontSize: 48, marginBottom: "1rem" }}>🎯</div>
        <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 8 }}>Fokus Tracker</h1>
        <p style={{ fontSize: 14, color: "#888780", marginBottom: "2rem", lineHeight: 1.6 }}>
          Kelola tugas kuliah, project klien, dan program organisasimu dalam satu tempat.
        </p>
        <button onClick={onLogin} disabled={loading} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          width: "100%", padding: "12px 20px", fontSize: 14, fontWeight: 600,
          background: "#fff", color: "#1a1a18", border: "1px solid #d3d1c7",
          borderRadius: 12, cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <GoogleIcon />
          {loading ? "Menghubungkan..." : "Masuk dengan Google"}
        </button>
        <p style={{ fontSize: 11, color: "#b4b2a9", marginTop: "1.5rem" }}>
          Data tersimpan aman di akun Google kamu
        </p>
      </div>
    </div>
  );
}

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

// ── Main Tracker ──────────────────────────────────────────────────────────────

function Tracker({ user, toast }) {
  const [tasks, setTasks]         = useState([]);
  const [catFilter, setCatFilter] = useState("semua");
  const [stFilter, setStFilter]   = useState("semua");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [editId, setEditId]       = useState(null);
  const [syncing, setSyncing]     = useState(false);
  const [loaded, setLoaded]       = useState(false);
  const notifChecked              = useRef(false);

  // Realtime listener
  useEffect(() => {
    const ref = docRef(user.uid);
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

  // Notifikasi browser saat data pertama kali load
  useEffect(() => {
    if (!loaded || notifChecked.current) return;
    notifChecked.current = true;
    requestNotifPermission().then(() => checkDeadlineNotifs(tasks));
  }, [loaded, tasks]);

  const persist = useCallback(async (next) => {
    setTasks(next);
    setSyncing(true);
    try {
      await setDoc(docRef(user.uid), { items: next });
    } catch (e) {
      toast("Gagal menyimpan. Coba lagi.", "error");
    } finally {
      setSyncing(false);
    }
  }, [user.uid, toast]);

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
    setForm(EMPTY);
    setShowForm(false);
  }

  function handleEdit(task) {
    setForm(task); setEditId(task.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(id) {
    if (!window.confirm("Hapus tugas ini?")) return;
    persist(tasks.filter(t => t.id !== id));
    toast("Tugas dihapus", "warn");
  }

  function handleCycle(id) {
    const order = ["belum", "proses", "selesai"];
    const labels = { belum: "Belum Mulai", proses: "Dalam Proses", selesai: "Selesai" };
    const updated = tasks.map(t => {
      if (t.id !== id) return t;
      const next = order[(order.indexOf(t.status) + 1) % 3];
      toast(`Status → ${labels[next]}`);
      return { ...t, status: next };
    });
    persist(updated);
  }

  const filtered = tasks
    .filter(t => catFilter === "semua" || t.category === catFilter)
    .filter(t => stFilter  === "semua" || t.status   === stFilter)
    .sort((a, b) => {
      const p = { tinggi: 0, sedang: 1, rendah: 2 };
      if (p[a.priority] !== p[b.priority]) return p[a.priority] - p[b.priority];
      if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
      return a.deadline ? -1 : 1;
    });

  const counts = {
    total:   tasks.length,
    urgent:  tasks.filter(t => t.priority === "tinggi" && t.status !== "selesai").length,
    proses:  tasks.filter(t => t.status === "proses").length,
    selesai: tasks.filter(t => t.status === "selesai").length,
  };

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem" }}>
      <p style={{ color: "#888780", fontSize: 14 }}>Memuat data...</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Fokus Tracker</h1>
          <p style={{ fontSize: 12, color: "#888780", marginTop: 2 }}>Halo, {user.displayName?.split(" ")[0]} 👋</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {syncing && <span style={{ fontSize: 11, color: "#888780" }}>Menyimpan...</span>}
          <img src={user.photoURL} alt="" width={32} height={32} style={{ borderRadius: "50%", border: "2px solid #e8e7e0" }} />
          <button onClick={() => signOut(auth)} style={{ ...btnSm, fontSize: 11 }}>Keluar</button>
        </div>
      </div>

      {/* Deadline alerts */}
      <DeadlineAlerts tasks={tasks} />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8, marginBottom: "1.5rem" }}>
        {[
          { label: "Total",        value: counts.total,   color: "#1a1a18" },
          { label: "Prioritas ↑",  value: counts.urgent,  color: "#D85A30" },
          { label: "Dalam Proses", value: counts.proses,  color: "#185FA5" },
          { label: "Selesai",      value: counts.selesai, color: "#3B6D11" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #e8e7e0", borderRadius: 10, padding: "10px 12px" }}>
            <p style={{ margin: 0, fontSize: 11, color: "#888780", fontWeight: 500 }}>{s.label}</p>
            <p style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 600, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter kategori + tambah */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
        {["semua", "kuliah", "klien", "organisasi"].map(c => {
          const active = catFilter === c;
          const cat = CATS[c];
          return (
            <button key={c} onClick={() => setCatFilter(c)} style={{
              padding: "5px 14px", fontSize: 12, borderRadius: 999, cursor: "pointer", fontWeight: active ? 600 : 400,
              border: active && cat ? `1.5px solid ${cat.color}` : active ? "1.5px solid #1a1a18" : "1px solid #d3d1c7",
              background: active && cat ? cat.bg : active ? "#f1efe8" : "transparent",
              color: active && cat ? cat.text : active ? "#1a1a18" : "#888780",
            }}>
              {c === "semua" ? "Semua" : cat.label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(v => !v); }} style={{
          padding: "6px 16px", fontSize: 12, fontWeight: 600,
          background: showForm && !editId ? "#f1efe8" : "#1D9E75",
          color: showForm && !editId ? "#888780" : "#fff",
          border: "none", borderRadius: 10, cursor: "pointer",
        }}>
          {showForm && !editId ? "✕ Tutup" : "+ Tambah"}
        </button>
      </div>

      {/* Filter status */}
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
              border: active ? "1px solid #1a1a18" : "1px solid #d3d1c7",
              background: active ? "#1a1a18" : "transparent",
              color: active ? "#fff" : "#888780", fontWeight: active ? 500 : 400,
            }}>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <TaskForm form={form} setForm={setForm} onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }}
          isEdit={!!editId} />
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <p style={{ fontSize: 14, color: "#888780" }}>
            {tasks.length === 0 ? 'Belum ada tugas. Klik "+ Tambah" untuk mulai!' : "Tidak ada tugas dengan filter ini."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {filtered.map(task => (
            <TaskCard key={task.id} task={task} onEdit={handleEdit} onDelete={handleDelete} onCycle={handleCycle} />
          ))}
        </div>
      )}

      <p style={{ marginTop: "1.5rem", fontSize: 11, color: "#b4b2a9", textAlign: "center" }}>
        Klik badge status untuk mengubahnya · Diurutkan: prioritas → deadline
      </p>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]         = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const { toasts, add: toast }  = useToast();

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
      <p style={{ color: "#888780", fontSize: 14 }}>Memuat...</p>
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
