import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

global.photoStore = global.photoStore || [];

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
const isImage = (url) => IMAGE_EXTS.some(e => url.toLowerCase().split('?')[0].endsWith(e));

export async function GET() {
  let photos = [];
  let isBlobActive = false;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import('@vercel/blob');

      // 1. Try to read the index file (has name + message for every photo)
      let indexEntries = [];
      try {
        const { blobs: indexBlobs } = await list({ prefix: 'nisan-index', limit: 10 });
        if (indexBlobs.length > 0) {
          indexBlobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
          const res = await fetch(indexBlobs[0].url + '?nc=' + Date.now());
          indexEntries = await res.json();
        }
      } catch (e) {
        console.error('index read error:', e.message);
      }

      if (indexEntries.length > 0) {
        // Use the index as the primary source of truth
        photos = indexEntries.filter(e => e && e.url && isImage(e.url));
        isBlobActive = true;
      } else {
        // Fallback: list all image blobs (old uploads without index)
        let allBlobs = [];
        let cursor;
        do {
          const res = await list({ limit: 1000, cursor });
          allBlobs = allBlobs.concat(res.blobs);
          cursor = res.cursor;
        } while (cursor);

        photos = allBlobs
          .filter(b => isImage(b.url) && !b.pathname?.startsWith('nisan-index'))
          .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
          .map(b => ({
            url: b.url,
            name: 'Misafir',
            message: '',
            timestamp: new Date(b.uploadedAt).getTime(),
          }));
        isBlobActive = true;
      }
    } catch (err) {
      console.error("Blob error:", err.message);
    }
  }

  // Add memory fallback entries
  const memPhotos = (global.photoStore || []).map(p =>
    typeof p === 'string'
      ? { url: p, name: 'Misafir', message: '', timestamp: 0 }
      : p
  );

  const combined = [...photos, ...memPhotos];
  const seen = new Set();
  const unique = combined.filter(p => {
    if (!p?.url || seen.has(p.url)) return false;
    seen.add(p.url); return true;
  });

  return NextResponse.json({
    photos: unique,
    diagnostics: {
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      isBlobActive,
      count: unique.length,
    },
  });
}