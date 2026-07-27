"use client";

import { useState, useRef } from "react";
import Head from "next/head";

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Resize image before upload (max 1600px, 85% quality)
  const resizeImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onerror = reject;
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onerror = reject;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          const maxSize = 1600;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    setSuccess(false);
    setError(null);
    setSuccessCount(0);

    try {
      // Resize all images
      const images = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Hazırlanıyor... ${i + 1}/${files.length}`);
        const dataUrl = await resizeImage(files[i]);
        images.push({ dataUrl, filename: files[i].name });
      }

      setUploadProgress(`${files.length} fotoğraf yükleniyor...`);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Yükleme başarısız oldu.");
      }

      setSuccess(true);
      setSuccessCount(data.count || files.length);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Bir hata oluştu, lütfen tekrar deneyin.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleBtnClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="minimalist-wrapper">
      <Head>
        <title>Yusuf & Şevval Nişan Töreni</title>
      </Head>

      <div className="content-container">
        {/* Central Photo */}
        <div className="photo-section anim-fade-up delay-1">
          <img
            src="/childhood-photo.png"
            alt="Yusuf ve Şevval Küçüklük"
            className="center-photo"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>

        {/* Upload Section */}
        <div className="upload-section anim-fade-up delay-2">
          <button
            className="elegant-upload-btn"
            onClick={handleBtnClick}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <span className="loading-spinner"></span>
                {uploadProgress || "Yükleniyor..."}
              </>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Fotoğraf Yükle
              </>
            )}
          </button>

          {/* multiple allows selecting several photos at once */}
          <input
            type="file"
            accept="image/*"
            multiple
            className="file-input"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <p className="instruction-text">
            Birden fazla fotoğraf seçebilirsiniz 📸
          </p>

          {success && (
            <p className="success-msg">
              {successCount > 1 
                ? `${successCount} fotoğraf eklendi 🤍` 
                : "Fotoğrafınız eklendi 🤍"}
            </p>
          )}
          {error && <p className="error-msg">{error}</p>}
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
  );
}