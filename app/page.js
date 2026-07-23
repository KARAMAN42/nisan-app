"use client";

import { useState, useRef } from "react";
import Head from "next/head";
import { upload } from "@vercel/blob/client";

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setSuccess(false);
    setError(null);

    try {
      // Fotoğrafı sunucuya uğratmadan direkt Blob'a yüklüyoruz
      await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });

      setSuccess(true);
    } catch (err) {
      setError("Bir hata oluştu, lütfen tekrar deneyin.");
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
              e.target.src = "https://via.placeholder.com/300x400/eeeeee/999999?text=Fotografiniz+Buraya";
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
                Yükleniyor...
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

          <input
            type="file"
            accept="image/*"
            className="file-input"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <p className="instruction-text">
            Fotoğraflarınızı yükleyerek bu<br />
            güzel anları ölümsüzleştirin.
          </p>

          {success && (
            <p className="success-msg">Harika! Fotoğrafınız eklendi 🤍</p>
          )}
          {error && (
            <p className="error-msg">{error}</p>
          )}
        </div>

        {/* Footer Area */}
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