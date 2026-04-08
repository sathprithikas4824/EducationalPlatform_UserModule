"use client";

// ── IMPORTANT: This page must have ZERO external imports beyond React/Next.js
// core. It is served when the app crashes offline, so any import that touches
// Supabase, AnnotationProvider, or heavy libs will also crash. All data is
// read directly from localStorage / cookies here.

import { useEffect, useState } from "react";

interface DownloadRecord {
  id: string;
  userId: string;
  topicId: number;
  topicName: string;
  moduleName: string;
  submoduleId?: number;
  fileName: string;
  fileType: string;
  content: string;
  downloadedAt: string;
}

interface ModuleGroup {
  submoduleId: number | null;
  moduleName: string;
  topics: DownloadRecord[];
}

interface ReaderTopic {
  topicId: number;
  topicName: string;
  fileType: string;
  content: string;
}

// ── Read user id from cookie (mirrors getLastUserId in supabase.ts) ───────────
function readLastUserId(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const nameEQ = "edu_last_user_id=";
    for (const c of document.cookie.split(";")) {
      const trimmed = c.trim();
      if (trimmed.startsWith(nameEQ))
        return decodeURIComponent(trimmed.slice(nameEQ.length));
    }
  } catch {}
  return null;
}

// ── Read downloads from localStorage ─────────────────────────────────────────
function readDownloads(userId: string): DownloadRecord[] {
  try {
    const raw = localStorage.getItem(`edu_downloads_${userId}`);
    return raw ? (JSON.parse(raw) as DownloadRecord[]) : [];
  } catch {
    return [];
  }
}

// Scan all edu_downloads_* keys as fallback
function readAllDownloads(): DownloadRecord[] {
  try {
    const all: DownloadRecord[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("edu_downloads_")) {
        const raw = localStorage.getItem(key);
        if (raw) all.push(...(JSON.parse(raw) as DownloadRecord[]));
      }
    }
    return all;
  } catch {
    return [];
  }
}

function groupByModule(downloads: DownloadRecord[]): ModuleGroup[] {
  const map = new Map<string, ModuleGroup>();
  for (const d of downloads) {
    const key = d.submoduleId != null ? String(d.submoduleId) : d.moduleName;
    if (!map.has(key))
      map.set(key, { submoduleId: d.submoduleId ?? null, moduleName: d.moduleName, topics: [] });
    map.get(key)!.topics.push(d);
  }
  return Array.from(map.values());
}

function buildReaderTopics(records: DownloadRecord[]): ReaderTopic[] {
  const byId = new Map<number, DownloadRecord>();
  for (const r of records) {
    const ex = byId.get(r.topicId);
    if (!ex || r.fileType === "html") byId.set(r.topicId, r);
  }
  return Array.from(byId.values())
    .sort((a, b) => a.topicId - b.topicId)
    .map((r) => ({ topicId: r.topicId, topicName: r.topicName, fileType: r.fileType, content: r.content }));
}

// ── Parse txt content (old format) ───────────────────────────────────────────
function parseTxt(content: string): { title: string; body: string } {
  const SEP = "=".repeat(64);
  const THIN = "-".repeat(64);
  const sections = content.split(SEP).map((s) => s.trim()).filter((s) => s.length > 0);
  const raw = sections.length >= 3 ? sections[2] : sections[sections.length - 1] ?? content;
  const parts = raw.split(THIN).map((s) => s.trim()).filter((s) => s.length > 0);
  const safe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let title = "", desc = "";
  if (parts.length >= 2) { title = parts[0].replace(/\n/g, " ").trim(); desc = parts.slice(1).join("\n\n").trim(); }
  else desc = (parts[0] ?? raw).trim();
  const body = desc.split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter((p) => p.length > 0).map((p) => `<p>${safe(p)}</p>`).join("\n") || `<p>${safe(desc)}</p>`;
  return { title, body };
}

// ── Inline Reader ─────────────────────────────────────────────────────────────
function Reader({ group, onBack }: { group: ModuleGroup; onBack: () => void }) {
  const topics = buildReaderTopics(group.topics);
  const [idx, setIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const topic = topics[idx];

  const getContent = () => {
    if (!topic) return { title: null, html: null, isPlain: false };
    if (topic.fileType === "html") {
      try {
        const p = JSON.parse(topic.content) as { title?: string; description?: string };
        return { title: p.title || null, html: p.description || null, isPlain: false };
      } catch { return { title: null, html: topic.content, isPlain: false }; }
    }
    const { title, body } = parseTxt(topic.content);
    return { title, html: body, isPlain: true };
  };

  const { title, html, isPlain } = getContent();

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg, #fff)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--page-bg, #fff)", borderBottom: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#374151" }}>
          ← Downloads
        </button>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.moduleName}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 11, fontWeight: 600, color: "#dc2626" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
          Offline
        </span>
      </header>

      {/* Mobile topic toggle */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #f3f4f6", display: "block" }} className="lg:hidden">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#374151", background: "none", border: "none", cursor: "pointer" }}>
          ☰ {sidebarOpen ? "Hide" : "Topics"} ({topics.length})
        </button>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        {(sidebarOpen) && (
          <aside style={{ width: "100%", maxWidth: 260, padding: "16px 12px", borderRight: "1px solid #f3f4f6", background: "#f9fafb" }}>
            <div style={{ background: "#d4d4d4", borderRadius: 16, padding: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, padding: "0 4px" }}>Topics</p>
              {topics.map((t, i) => (
                <button key={t.topicId} onClick={() => { setIdx(i); setSidebarOpen(false); }}
                  style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: i === idx ? "1px solid #c4b5fd" : "none", background: i === idx ? "#ede9fe" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500, color: i === idx ? "#6d28d9" : "#374151", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: i === idx ? "#8b5cf6" : "#d1d5db", flexShrink: 0 }} />
                  {t.topicName}
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Sidebar desktop */}
        <aside className="hidden lg:block" style={{ width: 240, padding: "24px 12px", borderRight: "1px solid #f3f4f6", background: "#f9fafb", flexShrink: 0 }}>
          <div style={{ background: "#d4d4d4", borderRadius: 16, padding: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, padding: "0 4px" }}>Topics</p>
            {topics.map((t, i) => (
              <button key={t.topicId} onClick={() => setIdx(i)}
                style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: i === idx ? "1px solid #c4b5fd" : "none", background: i === idx ? "#ede9fe" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500, color: i === idx ? "#6d28d9" : "#374151", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: i === idx ? "#8b5cf6" : "#d1d5db", flexShrink: 0 }} />
                {t.topicName}
              </button>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, padding: "24px 20px", overflowX: "hidden", maxWidth: 740 }}>
          {topic ? (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>{group.moduleName}</p>
              {isPlain && title ? (
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 16 }}>{title}</h2>
              ) : title ? (
                <div className="ai-content-wrapper" style={{ marginBottom: 16 }} dangerouslySetInnerHTML={{ __html: title }} />
              ) : (
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 16 }}>{topic.topicName}</h2>
              )}
              {html ? (
                <div className="ai-content-wrapper" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <p style={{ color: "#9ca3af", fontStyle: "italic", fontSize: 14 }}>No content available.</p>
              )}
              {/* Prev / Next */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 40, paddingTop: 20, borderTop: "1px solid #e5e7eb" }}>
                <button onClick={() => setIdx((p) => Math.max(0, p - 1))} disabled={idx === 0}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid #e5e7eb", background: "none", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.4 : 1, fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  ← Previous
                </button>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{idx + 1} / {topics.length}</span>
                <button onClick={() => setIdx((p) => Math.min(topics.length - 1, p + 1))} disabled={idx === topics.length - 1}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: idx === topics.length - 1 ? "#e5e7eb" : "linear-gradient(90deg,#7a12fa,#b614ef)", cursor: idx === topics.length - 1 ? "not-allowed" : "pointer", opacity: idx === topics.length - 1 ? 0.4 : 1, fontSize: 13, fontWeight: 600, color: "#fff" }}>
                  Next →
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: "#9ca3af" }}>No topics found.</p>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Module card ───────────────────────────────────────────────────────────────
function ModuleCard({ group, onOpen, onRemove }: { group: ModuleGroup; onOpen: () => void; onRemove: () => void }) {
  const unique = buildReaderTopics(group.topics);
  const hasHtml = group.topics.some((t) => t.fileType === "html");
  const [confirming, setConfirming] = useState(false);

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirming(true);
  };

  const handleConfirmRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  const handleCancelRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirming(false);
  };

  if (confirming) {
    return (
      <div style={{ borderRadius: 16, border: "1px solid #fecaca", padding: 16, background: "#fef2f2", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#991b1b", margin: 0 }}>Remove this module?</p>
            <p style={{ fontSize: 12, color: "#b91c1c", margin: "2px 0 0" }}>
              <strong>{group.moduleName}</strong> — {unique.length} topic{unique.length !== 1 ? "s" : ""} will be removed from offline storage.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleConfirmRemove} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Remove
          </button>
          <button onClick={handleCancelRemove} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "1px solid #fecaca", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onOpen} style={{ borderRadius: 16, border: "1px solid #e5e7eb", padding: 16, cursor: "pointer", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", transition: "border-color 0.2s" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#a78bfa")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#7a12fa,#b614ef)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.moduleName}</p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{unique.length} topic{unique.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 20, background: hasHtml ? "#dcfce7" : "#fef3c7", color: hasHtml ? "#15803d" : "#92400e" }}>
            {hasHtml ? "Readable" : "Text"}
          </span>
          {/* Trash / remove button */}
          <button
            onClick={handleRemoveClick}
            title="Remove from offline storage"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", color: "#dc2626" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
          <span style={{ fontSize: 16, color: "#9ca3af" }}>›</span>
        </div>
      </div>
      {unique.slice(0, 2).map((t) => (
        <div key={t.topicId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{t.topicName}</span>
          <span style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase" }}>{t.fileType}</span>
        </div>
      ))}
      {unique.length > 2 && <p style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, margin: "6px 0 0 8px" }}>+{unique.length - 2} more</p>}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>Saved {new Date(group.topics[0].downloadedAt).toLocaleDateString()}</span>
        <button onClick={onOpen} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "none", background: "linear-gradient(90deg,#7a12fa,#b614ef)", color: "#fff", cursor: "pointer" }}>
          Open module
        </button>
      </div>
    </div>
  );
}

// ── Remove a module group from localStorage ────────────────────────────────────
function removeGroupLocally(userId: string | null, group: ModuleGroup): void {
  try {
    // Remove matching records from this user's key
    if (userId) {
      const raw = localStorage.getItem(`edu_downloads_${userId}`);
      const all: DownloadRecord[] = raw ? (JSON.parse(raw) as DownloadRecord[]) : [];
      const filtered = all.filter((d) => d.moduleName !== group.moduleName);
      localStorage.setItem(`edu_downloads_${userId}`, JSON.stringify(filtered));

      // Clear per-device "module done" flags for this submodule
      if (group.submoduleId != null) {
        const prefix = `edu_module_done_${userId}_`;
        const suffix = `_${group.submoduleId}`;
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix) && key.endsWith(suffix)) {
            localStorage.removeItem(key);
          }
        }
      }
    } else {
      // Fallback: scan all edu_downloads_* keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("edu_downloads_")) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const all: DownloadRecord[] = JSON.parse(raw) as DownloadRecord[];
          const filtered = all.filter((d) => d.moduleName !== group.moduleName);
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    }
  } catch {
    // ignore storage errors
  }
}

// ── Main offline page ─────────────────────────────────────────────────────────
export default function OfflinePage() {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGroup, setOpenGroup] = useState<ModuleGroup | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Read userId from cookie, then load from localStorage — no network calls
    const uid = readLastUserId();
    setUserId(uid);
    const records = uid ? readDownloads(uid) : readAllDownloads();
    setDownloads(records);
    setLoading(false);
  }, []);

  const handleRemoveGroup = (group: ModuleGroup) => {
    removeGroupLocally(userId, group);
    setDownloads((prev) => prev.filter((d) => d.moduleName !== group.moduleName));
  };

  if (openGroup) return <Reader group={openGroup} onBack={() => setOpenGroup(null)} />;

  const groups = groupByModule(downloads);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid #f3f4f6", padding: "12px 16px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 12, border: "1px solid #e5e7eb" }}>
            <img src="/logo.svg" alt="Logo" style={{ width: 20, height: 20 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Logo</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, border: "1px solid #fecaca", background: "#fef2f2" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>You're offline</span>
          </div>
          <button onClick={() => window.location.reload()} style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 10, border: "1px solid #e5e7eb", background: "none", cursor: "pointer", color: "#374151" }}>
            Reconnect
          </button>
        </div>
      </header>

      {/* Hero */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px 16px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, border: "1px solid #fecaca", background: "#fef2f2", marginBottom: 20 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>Offline Mode</span>
        </div>
        <h1 style={{ fontSize: "clamp(1.75rem,5vw,3rem)", fontWeight: 800, color: "#111827", margin: "0 0 12px" }}>
          You're <span style={{ color: "#ef4444" }}>offline</span> right now
        </h1>
        <p style={{ fontSize: 16, color: "#6b7280", maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.6 }}>
          No internet connection detected. Read any content you downloaded while online.
        </p>
        <button onClick={() => window.location.reload()}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 12, border: "none", background: "linear-gradient(90deg,#7a12fa,#b614ef)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          ↺ Try reconnecting
        </button>
      </div>

      {/* Downloads */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>
            Downloaded <span style={{ color: "#7c3aed" }}>Content</span>
          </h2>
          {!loading && downloads.length > 0 && (
            <span style={{ padding: "2px 10px", borderRadius: 20, background: "#ede9fe", fontSize: 12, fontWeight: 700, color: "#6d28d9" }}>
              {downloads.length} file{downloads.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading ? (
          <p style={{ color: "#9ca3af" }}>Loading...</p>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 16px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>No downloaded content</h3>
            <p style={{ color: "#6b7280", fontSize: 14, maxWidth: 300, margin: "0 auto", lineHeight: 1.6 }}>
              Go online, open a module, and use the &ldquo;Download Module&rdquo; button to save topics for offline reading.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
            {groups.map((g) => (
              <ModuleCard key={g.submoduleId ?? g.moduleName} group={g} onOpen={() => setOpenGroup(g)} onRemove={() => handleRemoveGroup(g)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
