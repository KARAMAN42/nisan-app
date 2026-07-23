"use client";

import { useState, useEffect } from "react";
import Head from "next/head";

export default function AdminPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [diagnostics, setDiagnostics] = useState({ hasBlobToken: false, isBlobActive: false });

  // Touch Swipe State for Mobile Devices
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);

  const minSwipeDistance = 40; // minimum distance in px to count as a swipe

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/photos");
      const data = await res.json();
      if (data.photos) {
        setPhotos(data.photos);
      }
      if (data.diagnostics) {
        setDiagnostics(data.diagnostics);
      }
    } catch (err) {
      console.error("Fotoğraflar yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadOrShare = async (photoUrl, e) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const filename = photoUrl.split('/').pop() || 'foto.jpg';
      const mimeType = blob.type || 'image/jpeg';
      const file = new File([blob], filename, { type: mimeType });

      // iOS Safari and Mobile Web Share API support
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Nişan Fotoğrafı',
        });
        return;
      }
    } catch (err) {
      console.log("Web share fallback triggered:", err);
    }

    // Standard Browser Download Fallback
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = photoUrl.split('/').pop() || 'foto.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(photoUrl, '_blank');
    }
  };

  const openLightbox = (index) => {
    setSelectedPhotoIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhotoIndex(null);
  };

  const prevPhoto = (e) => {
    if (e) e.stopPropagation();
    if (selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    } else {
      setSelectedPhotoIndex(photos.length - 1);
    }
  };

  const nextPhoto = (e) => {
    if (e) e.stopPropagation();
    if (selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    } else {
      setSelectedPhotoIndex(0);
    }
  };

  // Touch Swipe Handlers for Mobile Swipe Left / Right
  const handleTouchStart = (e) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextPhoto();
    } else if (isRightSwipe) {
      prevPhoto();
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#ffffff', 
      minHeight: '100vh', 
      fontFamily: 'var(--font-body), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#1a1a1a'
    }}>
      <Head>
        <title>Özel Galeri | Yusuf & Şevval</title>
      </Head>

      {/* iOS Style Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(15px)',
        zIndex: 10,
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        padding: '1.2rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '1.6rem', 
            fontWeight: '700', 
            letterSpacing: '-0.5px',
            lineHeight: 1.2
          }}>
            Özel Galeri
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#777', marginTop: '2px' }}>
            {photos.length > 0 ? `${photos.length} Fotoğraf Paylaşıldı` : 'Misafir Fotoğrafları'}
          </p>
        </div>

        <button 
          onClick={fetchPhotos}
          style={{
            backgroundColor: '#f2f2f7',
            border: 'none',
            borderRadius: '20px',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: '600',
            color: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
          Yenile
        </button>
      </header>

      {/* Main Content Area */}
      <main style={{ padding: '0.8rem 0.5rem', maxWidth: '600px', margin: '0 auto' }}>
        
        {/* Connection Diagnostics Warning Alert */}
        {!loading && !diagnostics.isBlobActive && (
          <div style={{
            backgroundColor: '#fff9e6',
            border: '1px solid #ffe0b2',
            color: '#b78103',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', gap: '8px', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '4px' }}>
              <span>⚠️</span>
              <span>Kalıcı Depolama (Vercel Blob) Bağlantısı Bekleniyor</span>
            </div>
            Dün yüklediğiniz fotoğrafların kaybolmasının sebebi budur. Vercel Blob veri tabanını oluşturdunuz fakat projenin güncellenmiş sürümünü henüz Vercel'de yeniden derlemediniz (redeploy yapmadınız). Bu nedenle sistem fotoğrafları geçici belleğe aldı.
            <br />
            <br />
            <strong>Çözüm:</strong> Lütfen Vercel panelinizden (veya klasörü Vercel sürükle-bırak alanına tekrar atarak) projeyi <strong>Redeploy</strong> (yeniden dağıtım) yapın. Bu uyarı yeşile dönecektir.
          </div>
        )}

        {!loading && diagnostics.isBlobActive && (
          <div style={{
            backgroundColor: '#eafaf1',
            border: '1px solid #c7f0db',
            color: '#1b8a5a',
            padding: '0.8rem 1rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            fontSize: '0.88rem',
            lineHeight: '1.4',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500'
          }}>
            <span>✅</span>
            <span>Kalıcı Bulut Depolama Aktif. Artık yüklenen hiçbir fotoğraf silinmeyecektir!</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#888' }}>
            <p style={{ fontSize: '0.95rem' }}>Fotoğraflar yükleniyor...</p>
          </div>
        ) : photos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 1.5rem', color: '#888' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" style={{ marginBottom: '1rem' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p style={{ fontSize: '1rem', fontWeight: '500' }}>Henüz fotoğraf yüklenmemiş.</p>
            <p style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '0.4rem' }}>Misafirleriniz fotoğraf yükledikçe burada görünecek.</p>
          </div>
        ) : (
          /* iOS Photo Gallery Grid (3 columns) */
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '3px',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {photos.map((photoUrl, index) => (
              <div 
                key={index} 
                onClick={() => openLightbox(index)}
                style={{ 
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  backgroundColor: '#f0f0f0',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                <img 
                  src={photoUrl} 
                  alt={`Misafir Fotoğrafı ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.2s ease'
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Fullscreen Lightbox Modal */}
      {selectedPhotoIndex !== null && (
        <div 
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.2s ease',
            touchAction: 'pan-y'
          }}
        >
          {/* Modal Header Controls */}
          <div style={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingTop: '0.5rem',
            paddingHorizontal: '0.5rem',
            zIndex: 1001
          }}>
            <span style={{ color: '#fff', fontSize: '0.9rem', opacity: 0.8, fontWeight: '500' }}>
              {selectedPhotoIndex + 1} / {photos.length}
            </span>
            <button 
              onClick={closeLightbox}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ✕
            </button>
          </div>

          {/* Full Resolution Photo Container */}
          <div 
            style={{ 
              position: 'relative',
              width: '100%',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '1rem 0',
              userSelect: 'none'
            }}
          >
            {/* Previous Button */}
            {photos.length > 1 && (
              <button 
                onClick={prevPhoto}
                style={{
                  position: 'absolute',
                  left: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: 'none',
                  color: '#fff',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 1001,
                  fontSize: '1.5rem'
                }}
              >
                ‹
              </button>
            )}

            <img 
              src={photos[selectedPhotoIndex]} 
              alt="Büyük Görünüm"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                transition: 'transform 0.15s ease-out'
              }}
            />

            {/* Next Button */}
            {photos.length > 1 && (
              <button 
                onClick={nextPhoto}
                style={{
                  position: 'absolute',
                  right: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: 'none',
                  color: '#fff',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 1001,
                  fontSize: '1.5rem'
                }}
              >
                ›
              </button>
            )}
          </div>

          {/* Action Bar */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              marginBottom: '1rem',
              display: 'flex',
              gap: '12px',
              zIndex: 1001
            }}
          >
            <button
              onClick={(e) => handleDownloadOrShare(photos[selectedPhotoIndex], e)}
              style={{
                backgroundColor: '#ffffff',
                color: '#1a1a1a',
                border: 'none',
                borderRadius: '30px',
                padding: '0.9rem 2.2rem',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 5px 20px rgba(0,0,0,0.4)',
                cursor: 'pointer'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Fotoğrafı İndir / Kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
