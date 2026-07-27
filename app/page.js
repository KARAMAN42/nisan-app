"use client";

import { useState, useRef } from "react";
import Head from "next/head";

export default function Home() {
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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) setSelectedFiles(files);
  };

  const openSheet = () => {
    setSheetOpen(true);
    setSuccess(false);
    setError(null);
    setSelectedFiles([]);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setSelectedFiles([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!guestName.trim()) { setError("Lütfen adınızı girin."); return; }
    if (!selectedFiles.length) { setError("Lütfen en az bir fotoğraf seçin."); return; }

    setUploading(true);
    setError(null);

    try {
      const images = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress(`Hazırlanıyor ${i + 1}/${selectedFiles.length}...`);
        const dataUrl = await resizeImage(selectedFiles[i]);
        images.push({ dataUrl, filename: selectedFiles[i].name });
      }
      setUploadProgress(`${selectedFiles.length} fotoğraf yükleniyor...`);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, guestName: guestName.trim(), message: message.trim() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Yükleme başarısız.");

      setSuccess(true);
      setSuccessCount(data.count || selectedFiles.length);
      setSheetOpen(false);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError("Hata: " + err.message);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  return (
    <>
      <Head>
        <title>Yusuf & Şevval Nişan Töreni</title>
      </Head>

      <div className="minimalist-wrapper">
        <div className="content-container">
          {/* Central Photo */}
          <div className="photo-section anim-fade-up delay-1">
            <img
              src="/childhood-photo.png"
              alt="Yusuf ve Şevval"
              className="center-photo"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>

          {/* Upload Trigger Button */}
          <div className="upload-section anim-fade-up delay-2">
            <button className="elegant-upload-btn" onClick={openSheet}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Fotoğraf Yükle
            </button>
            <p className="instruction-text">Birden fazla fotoğraf seçebilirsiniz 📸</p>
            {success && (
              <p className="success-msg">
                {successCount > 1 ? `${successCount} fotoğraf eklendi 🤍` : "Fotoğrafınız eklendi 🤍"}
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
      </div>

      {/* Backdrop */}
      <div
        className={`sheet-backdrop ${sheetOpen ? "visible" : ""}`}
        onClick={closeSheet}
      />

      {/* Bottom Sheet */}
      <div className={`bottom-sheet ${sheetOpen ? "open" : ""}`}>
        {/* Handle bar */}
        <div className="sheet-handle" />

        <h2 className="sheet-title">Fotoğraf Paylaş</h2>

        {/* Name Input */}
        <div className="sheet-field">
          <label className="sheet-label">Adınız *</label>
          <input
            type="text"
            className="sheet-input"
            placeholder="Adınızı ve soyadınızı girin"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={60}
          />
        </div>

        {/* Message Input */}
        <div className="sheet-field">
          <label className="sheet-label">Mesajınız (isteğe bağlı)</label>
          <textarea
            className="sheet-textarea"
            placeholder="Bir mesaj bırakmak ister misiniz?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
          />
        </div>

        {/* File Selection */}
        <button
          className="sheet-select-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          {selectedFiles.length > 0
            ? `${selectedFiles.length} fotoğraf seçildi ✓`
            : "Fotoğraf Seç (Çoklu seçim yapabilirsiniz)"}
        </button>

        <input
          type="file"
          accept="image/*"
          multiple
          className="file-input"
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        {error && <p className="sheet-error">{error}</p>}

        {/* Upload Button */}
        <button
          className="sheet-upload-btn"
          onClick={handleUpload}
          disabled={uploading || !selectedFiles.length}
        >
          {uploading ? (
            <><span className="loading-spinner" />{uploadProgress || "Yükleniyor..."}</>
          ) : (
            "Yükle 🤍"
          )}
        </button>
      </div>
    </>
  );
}