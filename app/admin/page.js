"use client";

import { useState, useEffect, useRef } from "react";
import Head from "next/head";

const norm = (p) =>
  typeof p === "string" ? { url: p, name: "Misafir", message: "", timestamp: 0 } : p;

// Group photos by guest name, sorted by most recent upload
function groupByGuest(photos) {
  const map = {};
  for (const p of photos) {
    const key = p.name || "Misafir";
    if (!map[key]) map[key] = { name: key, message: p.message || "", photos: [], latest: 0 };
    map[key].photos.push(p);
    if (p.timestamp > map[key].latest) {
      map[key].latest = p.timestamp;
      if (p.message) map[key].message = p.message; // use most recent message
    }
  }
  return Object.values(map).sort((a, b) => b.latest - a.latest);
}

export default function AdminPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState({});

  // Comments
  const [allComments, setAllComments] = useState({}); // photoUrl -> comments[]
  const [openCommentPanels, setOpenCommentPanels] = useState({}); // photoUrl -> bool
  const [deletingComment, setDeletingComment] = useState(null);

  // Lightbox — flat index over ALL photos
  const [lbIndex, setLbIndex] = useState(null);
  const [dragY, setDragY] = useState(0);
  const touchRef = useRef({ x: 0, y: 0, time: 0 });
  const dirRef = useRef(null);
  const dragYRef = useRef(0);

  // Selection
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { fetchPhotos(); fetchComments(); }, []);

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

  const fetchComments = async () => {
    try {
      const res = await fetch("/api/feed?vid=admin");
      const data = await res.json();
      const map = {};
      for (const post of (data.posts || [])) {
        if (post.url && post.comments?.length) map[post.url] = post.comments;
      }
      setAllComments(map);
    } catch { }
  };

  const toggleCommentPanel = (photoUrl) => {
    setOpenCommentPanels(prev => ({ ...prev, [photoUrl]: !prev[photoUrl] }));
  };

  const deleteComment = async (photoUrl, timestamp) => {
    setDeletingComment(timestamp);
    // Optimistic remove
    setAllComments(prev => ({
      ...prev,
      [photoUrl]: (prev[photoUrl] || []).filter(c => c.timestamp !== timestamp),
    }));
    try {
      await fetch('/api/comment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl, timestamp }),
      });
    } catch { }
    finally { setDeletingComment(null); }
  };

  const totalCommentCount = Object.values(allComments).reduce((s, arr) => s + arr.length, 0);

  const groups = groupByGuest(photos);

  // Map each photo to its flat index (for lightbox navigation)
  const flatPhotos = groups.flatMap(g => g.photos);

  // ─── LIGHTBOX ───
  const openLb = (flatIdx) => {
    if (selectMode) { toggleSelect(flatIdx); return; }
    setLbIndex(flatIdx);
    setDragY(0);
    dirRef.current = null;
  };

  const closeLb = () => { setLbIndex(null); setDragY(0); dirRef.current = null; };
  const nextPhoto = () => { setLbIndex(p => p < flatPhotos.length - 1 ? p + 1 : 0); setDragY(0); };
  const prevPhoto = () => { setLbIndex(p => p > 0 ? p - 1 : flatPhotos.length - 1); setDragY(0); };

  const onLbTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    dirRef.current = null; dragYRef.current = 0; setDragY(0);
  };

  const onLbTouchMove = (e) => {
    const t = e.touches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    if (!dirRef.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8)
        dirRef.current = Math.abs(dy) > Math.abs(dx) ? "v" : "h";
      return;
    }
    if (dirRef.current === "v" && dy > 0) {
      dragYRef.current = dy; setDragY(dy); e.preventDefault();
    }
  };

  const onLbTouchEnd = (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dt = Date.now() - touchRef.current.time;
    const velY = dragYRef.current / Math.max(dt, 1);
    if (dirRef.current === "v") {
      if (dragYRef.current > 120 || velY > 0.6) closeLb();
      else setDragY(0);
    } else if (dirRef.current === "h" && Math.abs(dx) > 40) {
      if (dx < 0) nextPhoto(); else prevPhoto();
    }
    dirRef.current = null;
  };

  // ─── SELECTION ───
  const toggleSelect = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const clearSelect = () => { setSelected(new Set()); setSelectMode(false); };

  // Get flat index of a photo
  const getFlatIndex = (photo) => flatPhotos.findIndex(p => p.url === photo.url);

  // ─── SAVE / SHARE ───
  // iOS: Opens native share sheet → "Fotoğrafı Kaydet" → directly to Photos library
  // Desktop: Falls back to regular download
  const savePhoto = async (url, name) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = blob.type.includes("png") ? "png" : "jpg";
      const file = new File([blob], `${name || "foto"}.${ext}`, { type: blob.type });

      // Try native iOS share (works on iPhone Safari → save to Photos)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: name || "Fotoğraf" });
        return;
      }

      // Desktop fallback
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl; a.download = `${name || "foto"}.${ext}`; a.click();
      URL.revokeObjectURL(objUrl);
    } catch (e) {
      if (e.name !== "AbortError") window.open(url, "_blank");
    }
  };

  const saveGroupPhotos = async (group) => {
    if (group.photos.length === 1) {
      await savePhoto(group.photos[0].url, group.name);
      return;
    }
    setDownloading(true);
    try {
      // Fetch all photos as File objects
      const files = [];
      for (let i = 0; i < group.photos.length; i++) {
        try {
          const res = await fetch(group.photos[i].url);
          const blob = await res.blob();
          const ext = blob.type.includes("png") ? "png" : "jpg";
          files.push(new File([blob], `${group.name}-${i + 1}.${ext}`, { type: blob.type }));
        } catch { }
      }

      // iOS: share all at once → Save X Images to Photos library
      if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title: `${group.name} Fotoğrafları` });
        return;
      }

      // Desktop fallback: download sequentially
      for (let i = 0; i < files.length; i++) {
        const objUrl = URL.createObjectURL(files[i]);
        const a = document.createElement("a");
        a.href = objUrl; a.download = files[i].name; a.click();
        URL.revokeObjectURL(objUrl);
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (e) {
      if (e.name !== "AbortError") alert("İndirme hatası: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  const saveSelected = async () => {
    if (!selected.size) return;
    setDownloading(true);
    try {
      const items = Array.from(selected).map(i => flatPhotos[i]);
      const files = [];
      for (let i = 0; i < items.length; i++) {
        try {
          const res = await fetch(items[i].url);
          const blob = await res.blob();
          const ext = blob.type.includes("png") ? "png" : "jpg";
          files.push(new File([blob], `${items[i].name || "foto"}-${i + 1}.${ext}`, { type: blob.type }));
        } catch { }
      }

      // iOS: share all selected photos at once
      if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title: "Nişan Fotoğrafları" });
        return;
      }

      // Desktop fallback
      for (let i = 0; i < files.length; i++) {
        const objUrl = URL.createObjectURL(files[i]);
        const a = document.createElement("a");
        a.href = objUrl; a.download = files[i].name; a.click();
        URL.revokeObjectURL(objUrl);
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (e) {
      if (e.name !== "AbortError") alert("İndirme hatası: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  const photoScale = Math.max(0.75, 1 - dragY / 1200);
  const photoOpacity = Math.max(0, 1 - dragY / 350);
  const bgOpacity = Math.max(0, 0.96 - dragY / 450);

  return (
    <div className="admin-page-container" style={{ fontFamily: "var(--font-body),-apple-system,sans-serif", backgroundColor: "#f2f2f7", minHeight: "100vh", color: "#1a1a1a", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <Head><title>Özel Galeri | Yusuf & Şevval</title></Head>

      {/* ─── HEADER ─── */}
      <header style={{ position: "sticky", top: 0, background: "rgba(242,242,247,0.92)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(0,0,0,0.07)", padding: "0.9rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 20 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1.4rem", letterSpacing: "-0.3px" }}>
            {selectMode ? `${selected.size} seçildi` : "Özel Galeri"}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#888", marginTop: "2px" }}>
            {groups.length} misafir · {photos.length} fotoğraf · {totalCommentCount} yorum
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {selectMode ? (
            <>
              <button onClick={() => setSelected(new Set(flatPhotos.map((_, i) => i)))} style={btnStyle("#fff", "#1a1a1a")}>Tümü</button>
              <button onClick={clearSelect} style={btnStyle("#fff", "#1a1a1a")}>İptal</button>
            </>
          ) : (
            <>
              <button onClick={() => { setSelectMode(true); setSelected(new Set()); }} style={btnStyle("#fff", "#1a1a1a")}>Seç</button>
              <button onClick={fetchPhotos} style={btnStyle("#fff", "#1a1a1a")}>↻</button>
            </>
          )}
        </div>
      </header>



      {/* ─── GROUPED CONTENT ─── */}
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "0.8rem 0 5rem" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#aaa" }}>Yükleniyor...</div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 1rem", color: "#aaa" }}>
            <div style={{ fontWeight: 500 }}>Henüz fotoğraf yok.</div>
          </div>
        ) : groups.map((group, groupIdx) => (
          <div
            key={group.name}
            style={{
              margin: "0 0 0.8rem",
              background: "white",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              animation: `fadeUp 0.5s ease both ${groupIdx * 0.1}s`,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            {/* Guest Header */}
            <div style={{ padding: "0.9rem 1rem 0.75rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              {/* Row 1: Avatar + Name + Download */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {/* Avatar */}
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1a1a1a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1rem", flexShrink: 0, transition: "transform 0.2s ease" }}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.2, transition: "color 0.2s ease" }}>{group.name}</div>
                    <div style={{ fontSize: "0.73rem", color: "#bbb", marginTop: 1 }}>{group.photos.length} fotoğraf yükledi</div>
                  </div>
                </div>
                {/* Save / Share */}
                <button
                  onClick={() => saveGroupPhotos(group)}
                  disabled={downloading}
                  style={{
                    background: "#f2f2f7",
                    border: "none",
                    borderRadius: 20,
                    padding: "0.38rem 0.85rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#1a1a1a",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                    transition: "transform 0.15s ease, background-color 0.15s ease",
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {group.photos.length > 1 ? "Tümünü Kaydet" : "Kaydet"}
                </button>
              </div>

              {/* Row 2: Message bubble - shown directly under name */}
              {group.message && (
                <div style={{
                  marginTop: "0.6rem",
                  marginLeft: "50px",
                  background: "#f5f5f7",
                  borderRadius: "0 14px 14px 14px",
                  padding: "0.6rem 0.95rem",
                  fontSize: "0.9rem",
                  color: "#2c2c2e",
                  lineHeight: 1.45,
                  position: "relative",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  animation: "fadeUp 0.4s ease both 0.15s"
                }}>
                  <span style={{ position: "absolute", left: -8, top: 8, fontSize: 10, color: "#f5f5f7" }}>◄</span>
                  {group.message}
                </div>
              )}
            </div>

            {/* Photos Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, padding: 2 }}>
              {group.photos.map((photo, j) => {
                const flatIdx = getFlatIndex(photo);
                return (
                  <div
                    key={j}
                    onClick={() => openLb(flatIdx)}
                    style={{
                      position: "relative",
                      aspectRatio: "1/1",
                      background: "#f0f0f0",
                      cursor: "pointer",
                      overflow: "hidden",
                      borderRadius: 6,
                      transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    <img
                      src={photo.url}
                      alt={`${group.name} - ${j + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    {selectMode && (
                      <div style={{ position: "absolute", inset: 0, background: selected.has(flatIdx) ? "rgba(0,122,255,0.3)" : "transparent", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "6px" }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${selected.has(flatIdx) ? "#007aff" : "white"}`, background: selected.has(flatIdx) ? "#007aff" : "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {selected.has(flatIdx) && <span style={{ color: "white", fontSize: 13, fontWeight: "bold" }}>✓</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── COMMENTS SECTION ─── */}
            {(() => {
              const groupComments = group.photos.flatMap(photo =>
                (allComments[photo.url] || []).map(c => ({ ...c, photoUrl: photo.url }))
              ).sort((a, b) => b.timestamp - a.timestamp);
              if (!groupComments.length) return null;
              const panelKey = group.name;
              const isOpen = openCommentPanels[panelKey];
              return (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <button
                    onClick={() => setOpenCommentPanels(prev => ({ ...prev, [panelKey]: !prev[panelKey] }))}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#555' }}
                  >
                    <span>{groupComments.length} Yorum</span>
                    <span style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '0.7rem' }}>▼</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 1rem 0.8rem' }}>
                      {groupComments.map((c, ci) => (
                        <div key={ci} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '0.5rem 0', borderBottom: ci < groupComments.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e0e0e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0, color: '#555' }}>
                            {(c.name || 'M').charAt(0)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{c.name} </span>
                            <span style={{ fontSize: '0.85rem', color: '#333' }}>{c.text}</span>
                            <div style={{ fontSize: '0.68rem', color: '#bbb', marginTop: 2 }}>
                              {new Date(c.timestamp).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteComment(c.photoUrl, c.timestamp)}
                            disabled={deletingComment === c.timestamp}
                            style={{ background: 'none', border: 'none', color: '#ccc', fontSize: '0.75rem', cursor: 'pointer', padding: '2px 5px', borderRadius: 4, flexShrink: 0, transition: 'color 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#e53935'}
                            onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
                          >
                            Sil
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </main>

      {/* ─── BULK SAVE BAR ─── */}
      {selectMode && selected.size > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "1rem", background: "rgba(255,255,255,0.96)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", justifyContent: "center", zIndex: 30 }}>
          <button onClick={saveSelected} disabled={downloading} style={{ background: "#1a1a1a", color: "white", border: "none", borderRadius: 50, padding: "0.9rem 2rem", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" }}>
            {downloading ? "Hazırlanıyor..." : `${selected.size} Fotoğrafı Kaydet`}
          </button>
        </div>
      )}

      {/* ─── LIGHTBOX ─── */}
      {lbIndex !== null && lbIndex >= 0 && lbIndex < flatPhotos.length && (
        <div
          onTouchStart={onLbTouchStart}
          onTouchMove={onLbTouchMove}
          onTouchEnd={onLbTouchEnd}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: `rgba(0,0,0,${bgOpacity})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "env(safe-area-inset-top,1rem) 0 0" }}
        >
          {/* Top bar */}
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.8rem 1.2rem" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ color: "white", fontSize: "0.85rem", opacity: 0.75, fontWeight: 600 }}>
              {flatPhotos[lbIndex]?.name}
            </div>
            <button onClick={closeLb} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 32, height: 32, borderRadius: "50%", fontSize: "1rem", cursor: "pointer" }}>✕</button>
          </div>

          {/* Photo */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "0 1rem", userSelect: "none" }}>
            <img
              src={flatPhotos[lbIndex]?.url}
              alt=""
              style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 10, transform: `translateY(${dragY}px) scale(${photoScale})`, opacity: photoOpacity, transition: dragY === 0 ? "transform 0.3s ease, opacity 0.3s ease" : "none", touchAction: "none" }}
              draggable={false}
            />
          </div>

          {/* Bottom info + download */}
          <div style={{ width: "100%", padding: "0.8rem 1.5rem 2rem", opacity: photoOpacity }} onClick={(e) => e.stopPropagation()}>
            <div style={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>{flatPhotos[lbIndex]?.name}</div>
            {flatPhotos[lbIndex]?.message && (
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.88rem", marginTop: "3px", marginBottom: "1rem", fontStyle: "italic" }}>"{flatPhotos[lbIndex].message}"</div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: "0.8rem" }}>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>{lbIndex + 1} / {flatPhotos.length}</div>
              <button
                onClick={() => savePhoto(flatPhotos[lbIndex]?.url, flatPhotos[lbIndex]?.name)}
                style={{ background: "white", color: "#1a1a1a", border: "none", borderRadius: 50, padding: "0.7rem 1.6rem", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", marginLeft: "auto" }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle = (bg, color) => ({
  background: bg, color, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 20,
  padding: "0.45rem 0.9rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer"
});
