"use client";

import { useState, useEffect, useRef } from "react";
import Head from "next/head";

// Normalize photo entry (support old string format and new object format)
const norm = (p) =>
  typeof p === "string" ? { url: p, name: "Misafir", message: "", timestamp: 0 } : p;

export default function AdminPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState({});

  // Lightbox
  const [lbIndex, setLbIndex] = useState(null);
  const [dragY, setDragY] = useState(0);
  const touchRef = useRef({ x: 0, y: 0, time: 0 });
  const dirRef = useRef(null); // 'h' | 'v' | null
  const dragYRef = useRef(0);

  // Multi-select
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { fetchPhotos(); }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/photos");
      const data = await res.json();
      setPhotos((data.photos || []).map(norm));
      setDiagnostics(data.diagnostics || {});
    } finally {
      setLoading(false);
    }
  };

  // ─── LIGHTBOX ───
  const openLb = (i) => {
    if (selectMode) { toggleSelect(i); return; }
    setLbIndex(i);
    setDragY(0);
    dirRef.current = null;
  };

  const closeLb = () => { setLbIndex(null); setDragY(0); dirRef.current = null; };
  const nextPhoto = () => { setLbIndex(p => p < photos.length - 1 ? p + 1 : 0); setDragY(0); };
  const prevPhoto = () => { setLbIndex(p => p > 0 ? p - 1 : photos.length - 1); setDragY(0); };

  const onLbTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    dirRef.current = null;
    dragYRef.current = 0;
    setDragY(0);
  };

  const onLbTouchMove = (e) => {
    const t = e.touches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;

    if (!dirRef.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        dirRef.current = Math.abs(dy) > Math.abs(dx) ? "v" : "h";
      }
      return;
    }

    if (dirRef.current === "v" && dy > 0) {
      dragYRef.current = dy;
      setDragY(dy);
      e.preventDefault();
    }
  };

  const onLbTouchEnd = (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.time;
    const velY = dy / Math.max(dt, 1);

    if (dirRef.current === "v") {
      if (dragYRef.current > 120 || velY > 0.6) { closeLb(); }
      else { setDragY(0); }
    } else if (dirRef.current === "h" && Math.abs(dx) > 40) {
      if (dx < 0) nextPhoto(); else prevPhoto();
    }
    dirRef.current = null;
  };

  // ─── SELECT ───
  const toggleSelect = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const clearSelect = () => { setSelected(new Set()); setSelectMode(false); };

  // ─── DOWNLOAD ───
  const downloadSingle = async (url, name) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl; a.download = `${name || "foto"}.${ext}`; a.click();
      URL.revokeObjectURL(objUrl);
    } catch { window.open(url, "_blank"); }
  };

  const downloadSelected = async () => {
    if (!selected.size) return;
    setDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folder = zip.folder("nisan-fotograflari");
      const items = Array.from(selected).map(i => photos[i]);

      for (let i = 0; i < items.length; i++) {
        const p = items[i];
        try {
          const res = await fetch(p.url);
          const blob = await res.blob();
          const ext = blob.type.includes("png") ? "png" : "jpg";
          folder.file(`${i + 1}-${p.name || "misafir"}.${ext}`, blob);
        } catch (e) { console.error("zip error", p.url, e); }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const objUrl = URL.createObjectURL(content);
      const a = document.createElement("a"); a.href = objUrl;
      a.download = "nisan-fotograflari.zip"; a.click();
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      alert("İndirme hatası: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const photoScale = Math.max(0.75, 1 - dragY / 1200);
  const photoOpacity = Math.max(0, 1 - dragY / 350);
  const bgOpacity = Math.max(0, 0.96 - dragY / 450);

  return (
    <div style={{ fontFamily: "var(--font-body),-apple-system,sans-serif", backgroundColor: "#fff", minHeight: "100vh", color: "#1a1a1a" }}>
      <Head><title>Özel Galeri | Yusuf & Şevval</title></Head>

      {/* ─── HEADER ─── */}
      <header style={{ position: "sticky", top: 0, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(0,0,0,0.07)", padding: "0.9rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 20 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1.4rem", letterSpacing: "-0.3px" }}>
            {selectMode ? `${selected.size} seçildi` : "Özel Galeri"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "2px" }}>
            {photos.length} fotoğraf
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {selectMode ? (
            <>
              <button onClick={() => setSelected(new Set(photos.map((_, i) => i)))} style={btnStyle("#f2f2f7", "#1a1a1a")}>Tümü</button>
              <button onClick={clearSelect} style={btnStyle("#f2f2f7", "#1a1a1a")}>İptal</button>
            </>
          ) : (
            <>
              <button onClick={() => { setSelectMode(true); setSelected(new Set()); }} style={btnStyle("#f2f2f7", "#1a1a1a")}>Seç</button>
              <button onClick={fetchPhotos} style={btnStyle("#f2f2f7", "#1a1a1a")}>↻ Yenile</button>
            </>
          )}
        </div>
      </header>

      {/* ─── STATUS BAR ─── */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0.6rem 1rem 0" }}>
        {!loading && diagnostics.isBlobActive && (
          <div style={{ background: "#eafaf1", border: "1px solid #c7f0db", color: "#1b8a5a", borderRadius: 10, padding: "0.6rem 0.9rem", fontSize: "0.82rem", fontWeight: 500, display: "flex", gap: 6, alignItems: "center" }}>
            <span>✅</span><span>Kalıcı Bulut Depolama Aktif! Fotoğraflar güvende.</span>
          </div>
        )}
        {!loading && !diagnostics.isBlobActive && (
          <div style={{ background: "#fff9e6", border: "1px solid #ffe0b2", color: "#b78103", borderRadius: 10, padding: "0.6rem 0.9rem", fontSize: "0.82rem" }}>
            ⚠️ Kalıcı depolama bağlı değil — Vercel'den Redeploy yapın.
          </div>
        )}
      </div>

      {/* ─── GRID ─── */}
      <main style={{ maxWidth: 600, margin: "0 auto", padding: "0.6rem 0" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#aaa" }}>Yükleniyor...</div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 1rem", color: "#aaa" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📷</div>
            <div style={{ fontSize: "1rem", fontWeight: 500 }}>Henüz fotoğraf yok.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2 }}>
            {photos.map((p, i) => (
              <div
                key={i}
                onClick={() => openLb(i)}
                style={{ position: "relative", aspectRatio: "1/1", background: "#f0f0f0", cursor: "pointer", overflow: "hidden" }}
              >
                <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {/* Selection overlay */}
                {selectMode && (
                  <div style={{ position: "absolute", inset: 0, background: selected.has(i) ? "rgba(0,122,255,0.3)" : "transparent", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "6px" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${selected.has(i) ? "#007aff" : "white"}`, background: selected.has(i) ? "#007aff" : "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {selected.has(i) && <span style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>✓</span>}
                    </div>
                  </div>
                )}
                {/* Name badge */}
                {!selectMode && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.6))", padding: "14px 6px 5px", fontSize: "0.7rem", color: "white", fontWeight: 500, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                    {p.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ─── BULK DOWNLOAD BAR ─── */}
      {selectMode && selected.size > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "1rem", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", gap: "10px", justifyContent: "center", zIndex: 30 }}>
          <button
            onClick={downloadSelected}
            disabled={downloading}
            style={{ background: "#1a1a1a", color: "white", border: "none", borderRadius: 50, padding: "0.9rem 2rem", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", display: "flex", gap: 8, alignItems: "center" }}
          >
            {downloading ? "⏳ Hazırlanıyor..." : `⬇️  ${selected.size} Fotoğrafı ZIP İndir`}
          </button>
        </div>
      )}

      {/* ─── LIGHTBOX ─── */}
      {lbIndex !== null && (
        <div
          onTouchStart={onLbTouchStart}
          onTouchMove={onLbTouchMove}
          onTouchEnd={onLbTouchEnd}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: `rgba(0,0,0,${bgOpacity})`,
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "space-between", padding: "env(safe-area-inset-top,1rem) 0 0",
          }}
        >
          {/* Top Bar */}
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.8rem 1.2rem", zIndex: 1001 }} onClick={(e) => e.stopPropagation()}>
            <span style={{ color: "white", fontSize: "0.9rem", opacity: 0.8 }}>{lbIndex + 1} / {photos.length}</span>
            <button onClick={closeLb} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 34, height: 34, borderRadius: "50%", fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Photo */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "0 1rem", userSelect: "none" }}>
            <img
              src={photos[lbIndex]?.url}
              alt={photos[lbIndex]?.name}
              style={{
                maxWidth: "100%", maxHeight: "70vh",
                objectFit: "contain", borderRadius: 10,
                transform: `translateY(${dragY}px) scale(${photoScale})`,
                opacity: photoOpacity,
                transition: dragY === 0 ? "transform 0.3s ease, opacity 0.3s ease" : "none",
                touchAction: "none",
              }}
              draggable={false}
            />
          </div>

          {/* Info + Download */}
          <div style={{ width: "100%", padding: "0.8rem 1.5rem 2rem", opacity: photoOpacity }} onClick={(e) => e.stopPropagation()}>
            <div style={{ color: "white", fontWeight: 600, fontSize: "1rem", marginBottom: "4px" }}>
              {photos[lbIndex]?.name || "Misafir"}
            </div>
            {photos[lbIndex]?.message && (
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.88rem", marginBottom: "1rem", fontStyle: "italic" }}>
                "{photos[lbIndex].message}"
              </div>
            )}
            <button
              onClick={() => downloadSingle(photos[lbIndex]?.url, photos[lbIndex]?.name)}
              style={{ background: "white", color: "#1a1a1a", border: "none", borderRadius: 50, padding: "0.75rem 2rem", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Fotoğrafı İndir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle = (bg, color) => ({
  background: bg, color, border: "none", borderRadius: 20, padding: "0.45rem 0.9rem",
  fontSize: "0.82rem", fontWeight: 600, cursor: "pointer"
});
