"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Head from "next/head";

const timeAgo = (ts) => {
  if (!ts) return '';
  const d = Date.now() - ts;
  if (d < 60000) return 'az önce';
  if (d < 3600000) return `${Math.floor(d / 60000)} dk önce`;
  if (d < 86400000) return `${Math.floor(d / 3600000)} sa önce`;
  return `${Math.floor(d / 86400000)} gün önce`;
};

export default function Home() {
  // ─── Upload state ───
  const [sheetOpen, setSheetOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [success, setSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // ─── Feed state ───
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedPosts, setFeedPosts] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [visitorId, setVisitorId] = useState('');
  const [openComments, setOpenComments] = useState({});
  const [commentForms, setCommentForms] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [commentErrors, setCommentErrors] = useState({});
  const pollRef = useRef(null);
  const feedScrollRef = useRef(null);

  // ─── Heart rain state ───
  const [flyingHearts, setFlyingHearts] = useState([]);
  const [flyingComments, setFlyingComments] = useState([]);

  // ─── Swipe gesture state ───
  const stripTouch = useRef({ startY: 0, startX: 0 });

  // ─── Guestbook state ───
  const [gbOpen, setGbOpen] = useState(false);
  const [gbName, setGbName] = useState('');
  const [gbMessage, setGbMessage] = useState('');
  const [gbSubmitting, setGbSubmitting] = useState(false);
  const [gbSuccess, setGbSuccess] = useState(false);
  const [gbError, setGbError] = useState('');

  // Init visitor ID
  useEffect(() => {
    let vid = localStorage.getItem('nisan-vid');
    if (!vid) {
      vid = 'v' + Math.random().toString(36).substr(2, 12);
      localStorage.setItem('nisan-vid', vid);
    }
    setVisitorId(vid);
    fetch(`/api/feed?vid=${vid}`).then(r => r.json()).then(d => {
      setFeedPosts(d.posts || []);
    }).catch(() => {});
  }, []);

  // Body scroll unlock when feed or guestbook is open
  useEffect(() => {
    const isOpen = feedOpen || gbOpen;
    document.body.style.touchAction = isOpen ? 'pan-y' : '';
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.touchAction = ''; document.body.style.overflow = ''; };
  }, [feedOpen, gbOpen]);

  // ─── Smart fetch (preserves optimistic comments) ───
  const fetchFeed = useCallback(async (vid) => {
    try {
      const res = await fetch(`/api/feed?vid=${vid || visitorId}`);
      const data = await res.json();
      const serverPosts = data.posts || [];
      setFeedPosts(prev => {
        if (!prev.length) return serverPosts;
        return serverPosts.map(serverPost => {
          const serverId = serverPost.url || serverPost.timestamp;
          const localPost = prev.find(p => (p.url || p.timestamp) === serverId);
          if (!localPost) return serverPost;

          // Preserve local like state if server hasn't updated yet (due to Vercel blob write lag)
          let finalLiked = serverPost.isLiked;
          let finalLikeCount = serverPost.likeCount;
          if (localPost.isLiked !== serverPost.isLiked) {
            finalLiked = localPost.isLiked;
            finalLikeCount = localPost.likeCount;
          }

          const localCount = (localPost.comments || []).length;
          const serverCount = (serverPost.comments || []).length;
          const finalComments = localCount > serverCount ? localPost.comments : serverPost.comments;
          const finalCommentCount = Math.max(serverPost.commentCount, localPost.commentCount);

          return {
            ...serverPost,
            isLiked: finalLiked,
            likeCount: finalLikeCount,
            comments: finalComments,
            commentCount: finalCommentCount,
          };
        });
      });
    } catch { }
  }, [visitorId]);

  const openFeed = async () => {
    setFeedOpen(true);
    setLoadingFeed(true);
    await fetchFeed(visitorId);
    setLoadingFeed(false);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchFeed(visitorId), 3000);
  };

  const closeFeed = () => {
    setFeedOpen(false);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // ─── Swipe to open feed ───
  const onStripTouchStart = (e) => {
    stripTouch.current.startY = e.touches[0].clientY;
    stripTouch.current.startX = e.touches[0].clientX;
  };

  const onStripTouchEnd = (e) => {
    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    const dy = endY - stripTouch.current.startY;
    const dx = endX - stripTouch.current.startX;
    
    // Eğer dikeyde yukarı doğru en az 30px kaydırıldıysa feed'i aç
    if (Math.abs(dy) > Math.abs(dx) && dy < -30) {
      openFeed();
    }
  };

  // ─── Heart rain ───
  const fireHearts = (e) => {
    if (!e) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const newHearts = Array.from({ length: 7 }, (_, i) => ({
      id: Date.now() + i,
      x: cx + (Math.random() - 0.5) * 50,
      y: cy,
      dx: (Math.random() - 0.5) * 80,
      size: 0.8 + Math.random() * 0.8,
    }));
    setFlyingHearts(prev => [...prev, ...newHearts]);
    setTimeout(() => setFlyingHearts(prev => prev.filter(h => !newHearts.some(n => n.id === h.id))), 1400);
  };

  // ─── Sparkle rain for comments ───
  const fireSparkles = (rect) => {
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const chars = ['✨', '💬', '✨', '💬', '✨'];
    const newSparkles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      char: chars[i % chars.length],
      x: cx + (Math.random() - 0.5) * 60,
      y: cy,
      dx: (Math.random() - 0.5) * 90,
      size: 0.8 + Math.random() * 0.8,
    }));
    setFlyingComments(prev => [...prev, ...newSparkles]);
    setTimeout(() => setFlyingComments(prev => prev.filter(s => !newSparkles.some(n => n.id === s.id))), 1400);
  };

  // ─── Like ───
  const handleLike = async (postId, e) => {
    const post = feedPosts.find(p => (p.url || p.timestamp) === postId);
    if (post && !post.isLiked) fireHearts(e);
    setFeedPosts(prev => prev.map(p => {
      if ((p.url || p.timestamp) !== postId) return p;
      return { ...p, isLiked: !p.isLiked, likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1 };
    }));
    try {
      await fetch('/api/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoUrl: postId, visitorId }) });
    } catch { }
  };

  // ─── Comments ───
  const toggleComments = (postId) => {
    setOpenComments(prev => ({ ...prev, [postId]: !prev[postId] }));
    if (!commentForms[postId]) setCommentForms(prev => ({ ...prev, [postId]: { name: guestName || '', text: '' } }));
  };

  const updateForm = (postId, field, val) => {
    setCommentForms(prev => ({ ...prev, [postId]: { ...(prev[postId] || {}), [field]: val } }));
  };

  const submitComment = async (postId, e) => {
    const form = commentForms[postId] || {};
    const text = form.text?.trim();
    const name = form.name?.trim() || guestName?.trim() || '';
    if (!name) { setCommentErrors(prev => ({ ...prev, [postId]: 'Lütfen adınızı girin.' })); return; }
    if (!text) { setCommentErrors(prev => ({ ...prev, [postId]: 'Yorum boş olamaz.' })); return; }
    setCommentErrors(prev => ({ ...prev, [postId]: '' }));

    // Capture the target element rect synchronously before the await fetch
    const rect = e?.currentTarget ? e.currentTarget.getBoundingClientRect() : null;

    setSubmitting(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch('/api/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoUrl: postId, name, text }) });
      const data = await res.json();
      if (data.success) {
        if (rect) fireSparkles(rect);
        setFeedPosts(prev => prev.map(p => {
          if ((p.url || p.timestamp) !== postId) return p;
          return { ...p, commentCount: p.commentCount + 1, comments: [...(p.comments || []), data.comment] };
        }));
        updateForm(postId, 'text', '');
      }
    } catch { }
    finally { setSubmitting(prev => ({ ...prev, [postId]: false })); }
  };


  // ─── Guestbook ───
  const submitGuestbook = async () => {
    if (!gbName.trim()) { setGbError('Lütfen adınızı girin.'); return; }
    if (!gbMessage.trim()) { setGbError('Lütfen bir mesaj yazın.'); return; }
    setGbError(''); setGbSubmitting(true);
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: gbName.trim(), message: gbMessage.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setGbSuccess(true);
        setGbMessage('');
        setTimeout(() => { setGbOpen(false); setGbSuccess(false); }, 2500);
        // Add to feed optimistically
        setFeedPosts(prev => [{ type: 'guestbook', name: gbName.trim(), message: gbMessage.trim(), timestamp: Date.now(), likeCount: 0, isLiked: false, commentCount: 0, comments: [] }, ...prev]);
      } else {
        setGbError(data.error || 'Bir hata oluştu.');
      }
    } catch { setGbError('Bağlantı hatası.'); }
    finally { setGbSubmitting(false); }
  };

  // ─── Upload ───
  const resizeImage = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          const maxSize = 1600;
          if (width > maxSize || height > maxSize) {
            if (width > height) { height = Math.round(height * maxSize / width); width = maxSize; }
            else { width = Math.round(width * maxSize / height); height = maxSize; }
          }
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

  const handleFileSelect = (e) => { const files = Array.from(e.target.files); if (files.length) setSelectedFiles(files); };
  const openSheet = () => { setSheetOpen(true); setSuccess(false); setError(null); setSelectedFiles([]); };
  const closeSheet = () => { setSheetOpen(false); setSelectedFiles([]); setError(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const handleUpload = async () => {
    if (!guestName.trim()) { setError("Lütfen adınızı girin."); return; }
    if (!selectedFiles.length) { setError("Lütfen en az bir fotoğraf seçin."); return; }
    setUploading(true); setError(null);
    try {
      const images = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress(`Hazırlanıyor ${i + 1}/${selectedFiles.length}...`);
        const dataUrl = await resizeImage(selectedFiles[i]);
        images.push({ dataUrl, filename: selectedFiles[i].name });
      }
      setUploadProgress(`${selectedFiles.length} fotoğraf yükleniyor...`);
      const res = await fetch("/api/upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, guestName: guestName.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Yükleme başarısız.");
      setSuccess(true); setSuccessCount(data.count || selectedFiles.length);
      setSheetOpen(false); setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => fetchFeed(visitorId), 2000);
    } catch (err) { setError("Hata: " + err.message); }
    finally { setUploading(false); setUploadProgress(""); }
  };

  // ─── Derived data ───
  const photoFeedPosts = feedPosts.filter(p => p.type === 'photo');
  const stripPhotos = feedPosts.filter(p => p.type === 'photo');
  
  // Sürekli akan animasyon için fotoğrafları çoğalt
  let basePhotos = [];
  if (stripPhotos.length > 0) {
    const repeats = Math.max(2, Math.ceil(12 / stripPhotos.length));
    for (let i = 0; i < repeats; i++) {
      basePhotos = [...basePhotos, ...stripPhotos];
    }
  }
  // Kusursuz döngü için dizinin tam 2 katı olması ve -%50 kayması gerekir
  const loopPhotos = basePhotos.length > 0 ? [...basePhotos, ...basePhotos] : [];

  // Most liked photo (only count if has ≥1 like)
  const mostLikedPost = photoFeedPosts.reduce((best, p) => (p.likeCount > 0 && p.likeCount > (best?.likeCount || 0)) ? p : best, null);

  // Feed display: most liked pinned first (if exists), then time order
  const displayPosts = mostLikedPost
    ? [{ ...mostLikedPost, isMostLiked: true }, ...feedPosts.filter(p => p.url !== mostLikedPost.url)]
    : feedPosts;

  return (
    <>
      <Head><title>Yusuf & Şevval Nişan Töreni</title></Head>

      {/* ─── FLYING HEARTS OVERLAY ─── */}
      {flyingHearts.map(h => (
        <div key={h.id} className="flying-heart" style={{ left: h.x, top: h.y, '--dx': h.dx + 'px', fontSize: h.size + 'rem' }}>🤍</div>
      ))}

      {/* ─── FLYING COMMENTS OVERLAY ─── */}
      {flyingComments.map(s => (
        <div key={s.id} className="flying-heart" style={{ left: s.x, top: s.y, '--dx': s.dx + 'px', fontSize: s.size + 'rem' }}>{s.char}</div>
      ))}

      <div className="minimalist-wrapper">
        <div className="content-container">
          {/* Central Photo */}
          <div className="photo-section anim-fade-up delay-1">
            <img src="/childhood-photo.png" alt="Yusuf ve Şevval" className="center-photo"
              onError={(e) => { e.target.style.display = "none"; }} />
          </div>

          {/* Buttons */}
          <div className="upload-section anim-fade-up delay-2">
            <button className="elegant-upload-btn" onClick={openSheet}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Fotoğraf Yükle
            </button>
            {/* Guestbook button */}
            <button className="guestbook-btn" onClick={() => { setGbOpen(true); setGbSuccess(false); setGbError(''); }}>
              Mesaj Bırak
            </button>
            <p className="instruction-text">Fotoğraflarınızla bu güzel anları ölümsüzleştirin</p>
            {success && (
              <p className="success-msg">
                {successCount > 1 ? `${successCount} fotoğraf eklendi` : "Fotoğrafınız eklendi"}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="footer-area anim-fade-up delay-3">
            <div className="names-container-inline">
              <svg width="50" height="15" viewBox="0 0 100 20" className="curly-line-left">
                <path d="M 0,15 Q 50,15 100,5" fill="none" stroke="var(--color-accent)" strokeWidth="1.2" />
              </svg>
              <span className="inline-names">Yusuf & Şevval</span>
              <svg width="50" height="15" viewBox="0 0 100 20" className="curly-line-right">
                <path d="M 0,5 Q 50,15 100,15" fill="none" stroke="var(--color-accent)" strokeWidth="1.2" />
              </svg>
            </div>
            <div className="heart-graphic">
              <svg viewBox="0 0 100 100" fill="none" stroke="var(--color-accent)" strokeWidth="1.2">
                <path d="M 50,80 C 50,80 30,50 35,35 C 38,25 50,30 50,45 C 50,30 62,25 65,35 C 70,50 50,80 50,80 Z" />
                <path d="M 50,80 C 40,95 60,95 50,80" />
              </svg>
            </div>
          </div>
        </div>

        {/* ─── PHOTO STRIP ─── */}
        {stripPhotos.length > 0 && (
          <div 
            className="photo-strip anim-fade-up" 
            onTouchStart={onStripTouchStart} 
            onTouchEnd={onStripTouchEnd}
          >
            <div className="strip-header">
              <span className="strip-label">Son anlar</span>
              <button className="strip-see-all" onClick={openFeed}>Tümünü gör →</button>
            </div>
            <div className="strip-scroll">
              <div className="strip-scroll-inner">
                {loopPhotos.map((p, i) => (
                  <div key={i} className="strip-thumb" onClick={openFeed}>
                    <img src={p.url} alt={p.name} />
                    <div className="strip-initial">{(p.name || 'M').charAt(0).toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── FEED OVERLAY ─── */}
      <div className={`feed-overlay${feedOpen ? ' open' : ''}`}>
        <div className="feed-header">
          <div>
            <div className="feed-header-title">Nişan Anları</div>
            <div className="feed-header-sub">{feedPosts.length} mektup · Yusuf & Şevval</div>
          </div>
          <button className="feed-close-btn" onClick={closeFeed}>✕</button>
        </div>

        <div className="feed-content" ref={feedScrollRef} style={{ overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
          {loadingFeed ? (
            <div className="feed-loading-state">
              <div className="feed-loading-spinner" />
              <div className="feed-loading-text">Mektuplar hazırlanıyor...</div>
            </div>
          ) : displayPosts.length === 0 ? (
            <div className="feed-empty-state">
              <div className="feed-empty-icon">✉️</div>
              <div className="feed-empty-text">Henüz mektup yok</div>
              <div className="feed-empty-sub">İlk hatırayı sen bırak!</div>
            </div>
          ) : displayPosts.map((post, i) => {
            const postId = post.url || post.timestamp;

            const commentsJSX = (
              <>
                {/* Actions */}
                <div className="feed-actions">
                  <button
                    className={`feed-like-btn${post.isLiked ? ' liked' : ''}`}
                    onClick={(e) => handleLike(postId, e)}
                  >
                    <span className="heart-icon">{post.isLiked ? '♥' : '♡'}</span>
                    <span>{post.likeCount > 0 ? post.likeCount : ''}</span>
                    <span style={{ fontSize: '0.9rem' }}>{post.isLiked ? 'Beğenildi' : 'Beğen'}</span>
                  </button>
                  <button className="feed-comment-btn" onClick={() => toggleComments(postId)}>
                    {post.commentCount > 0 && <span>{post.commentCount}</span>}
                    <span style={{ fontSize: '0.9rem' }}>Yanıtla</span>
                  </button>
                </div>

                {/* Comments */}
                {openComments[postId] && (
                  <div className="feed-comments">
                    {(post.comments || []).length > 0 ? (
                      <div className="feed-comments-list">
                        {(post.comments || []).map((c, j) => (
                          <div key={j} className="feed-comment-item">
                            <div style={{ flex: 1 }}>
                              <span className="feed-comment-name">{c.name} — </span>
                              <span className="feed-comment-text">{c.text}</span>
                              <div className="feed-comment-time">{timeAgo(c.timestamp)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '0.4rem 0', color: '#c4a882', fontSize: '0.9rem', fontFamily: 'var(--font-caveat), cursive' }}>Henüz yanıt yok... ilk sen yaz ✍️</div>
                    )}
                    <div className="feed-comment-form">
                      <input
                        className={`feed-comment-name-input${commentErrors[postId] && !commentForms[postId]?.name?.trim() ? ' input-error' : ''}`}
                        placeholder="Adınız..."
                        value={commentForms[postId]?.name || ''}
                        onChange={e => { updateForm(postId, 'name', e.target.value); setCommentErrors(prev => ({ ...prev, [postId]: '' })); }}
                        maxLength={40}
                        style={{ fontSize: '16px' }}
                      />
                      {commentErrors[postId] && <div className="feed-comment-error">{commentErrors[postId]}</div>}
                      <div className="feed-comment-row">
                        <input
                          className="feed-comment-text-input"
                          placeholder="Yanıtınızı yazın..."
                          value={commentForms[postId]?.text || ''}
                          onChange={e => updateForm(postId, 'text', e.target.value)}
                          maxLength={200}
                          onKeyDown={e => e.key === 'Enter' && submitComment(postId, e)}
                          style={{ fontSize: '16px' }}
                        />
                        <button className="feed-comment-send" onClick={(e) => submitComment(postId, e)} disabled={submitting[postId] || !(commentForms[postId]?.text?.trim())}>
                          {submitting[postId] ? '…' : '→'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );

            // ─── GUESTBOOK LETTER ───
            if (post.type === 'guestbook') {
              return (
                <div key={`gb-${i}`} className="letter-card guestbook-card" style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="letter-paper">
                    <div className="letter-rule" />
                    <div className="letter-from-line">
                      <span className="letter-from-label">Gönderen: </span>
                      <span className="letter-sender-name">{post.name}</span>
                    </div>
                    <div className="letter-date-line">{timeAgo(post.timestamp)}</div>
                    <div className="letter-rule letter-rule-thin" />
                    <div className="guestbook-message">{post.message}</div>
                    <div className="letter-rule letter-rule-thin" />
                    {commentsJSX}
                  </div>
                </div>
              );
            }

            // ─── PHOTO LETTER ───
            return (
              <div key={i} className="letter-card" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="letter-paper">
                  <div className="letter-rule" />
                  <div className="letter-from-line">
                    <span className="letter-from-label">Gönderen: </span>
                    <span className="letter-sender-name">{post.name}</span>
                  </div>
                  <div className="letter-date-line">{timeAgo(post.timestamp)}</div>
                  <div className="letter-rule letter-rule-thin" />

                  {post.message && (
                    <div className="letter-message">{post.message}</div>
                  )}

                  <div className="polaroid-wrap">
                    <div className="polaroid-frame">
                      <img src={post.url} alt={post.name} loading="lazy" />
                      <div className="polaroid-caption">{post.name}</div>
                    </div>
                  </div>

                  <div className="letter-rule letter-rule-thin" />
                  {commentsJSX}
                </div>
              </div>
            );
          })}
          <div style={{ height: '4rem' }} />
        </div>
      </div>

      {/* ─── BACKDROP ─── */}
      <div className={`sheet-backdrop ${(sheetOpen || gbOpen) ? "visible" : ""}`} onClick={() => { closeSheet(); setGbOpen(false); }} />

      {/* ─── UPLOAD BOTTOM SHEET ─── */}
      <div className={`bottom-sheet ${sheetOpen ? "open" : ""}`}>
        <div className="sheet-handle" />
        <h2 className="sheet-title">Fotoğraf Paylaş</h2>
        <div className="sheet-field">
          <label className="sheet-label">Adınız *</label>
          <input type="text" className="sheet-input" placeholder="Adınızı ve soyadınızı girin" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={60} />
        </div>
        <div className="sheet-field">
          <label className="sheet-label">Mesajınız (isteğe bağlı)</label>
          <textarea className="sheet-textarea" placeholder="Bir mesaj bırakmak ister misiniz?" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} />
        </div>
        <button className="sheet-select-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
          </svg>
          {selectedFiles.length > 0 ? `${selectedFiles.length} fotoğraf seçildi ✓` : "Fotoğraf Seç (Çoklu seçim yapabilirsiniz)"}
        </button>
        <input type="file" accept="image/*" multiple className="file-input" ref={fileInputRef} onChange={handleFileSelect} />
        {error && <p className="sheet-error">{error}</p>}
        <button className="sheet-upload-btn" onClick={handleUpload} disabled={uploading || !selectedFiles.length}>
          {uploading ? (<><span className="loading-spinner" />{uploadProgress || "Yükleniyor..."}</>) : ("Yükle")}
        </button>
      </div>

      {/* ─── GUESTBOOK BOTTOM SHEET ─── */}
      <div className={`bottom-sheet ${gbOpen ? "open" : ""}`}>
        <div className="sheet-handle" />
        <h2 className="sheet-title">Anı Defteri</h2>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem', lineHeight: 1.4 }}>
          Yusuf & Şevval'e fotoğraf göndermek yerine sadece güzel dileklerinizi bırakmak ister misiniz?
        </p>
        {gbSuccess ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#888' }}>&#10003;</div>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>Mesajınız iletildi!</div>
            <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.4rem' }}>Teşekkürler, güzel dilekleriniz için.</div>
          </div>
        ) : (
          <>
            <div className="sheet-field">
              <label className="sheet-label">Adınız *</label>
              <input type="text" className="sheet-input" placeholder="Adınızı girin" value={gbName} onChange={e => setGbName(e.target.value)} maxLength={60} />
            </div>
            <div className="sheet-field">
              <label className="sheet-label">Mesajınız *</label>
              <textarea className="sheet-textarea" style={{ height: 100 }} placeholder="Yusuf & Şevval'e güzel dileklerinizi yazın..." value={gbMessage} onChange={e => setGbMessage(e.target.value)} maxLength={300} />
            </div>
            {gbError && <p className="sheet-error">{gbError}</p>}
            <button className="sheet-upload-btn" onClick={submitGuestbook} disabled={gbSubmitting}>
              {gbSubmitting ? (<><span className="loading-spinner" />Gönderiliyor...</>) : "Mesajı Gönder"}
            </button>
          </>
        )}
      </div>
    </>
  );
}