import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

global.photoStore = global.photoStore || [];

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
const isImage = (url) => {
  const clean = (url || '').toLowerCase().split('?')[0];
  return IMAGE_EXTS.some(e => clean.endsWith(e));
};

let cachedPhotos = null;
let lastPhotosFetch = 0;

export async function GET() {
  const now = Date.now();
  if (cachedPhotos && (now - lastPhotosFetch < 15000)) {
    return NextResponse.json(cachedPhotos);
  }

  let photos = [];
  let isBlobActive = false;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import('@vercel/blob');

      // Step 1: Read the index for name/message metadata
      let indexMap = new Map(); // url -> { name, message, timestamp }
      try {
        const { blobs: indexBlobs } = await list({ prefix: 'nisan-index', limit: 10 });
        if (indexBlobs.length > 0) {
          indexBlobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
          const res = await fetch(indexBlobs[0].url, { next: { revalidate: 15 } });
          if (res.ok) {
            const entries = await res.json();
            for (const e of entries) {
              if (e?.url) indexMap.set(e.url, e);
            }
          }
        }
      } catch (e) {
        console.error('Index read error:', e.message);
      }

      // Step 2: List ALL blobs in storage (no prefix filter = old + new photos)
      let allBlobs = [];
      let cursor;
      do {
        const res = await list({ limit: 1000, cursor });
        allBlobs = allBlobs.concat(res.blobs);
        cursor = res.cursor;
      } while (cursor);

      // Step 3: Keep only image files (exclude index JSON files)
      const imgBlobs = allBlobs.filter(b =>
        isImage(b.url) &&
        !b.pathname?.startsWith('nisan-index')
      );

      // Step 4: Enrich with index metadata where available
      photos = imgBlobs
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .map(b => {
          const indexed = indexMap.get(b.url);
          if (indexed) {
            // New photo with name/message
            return {
              url: b.url,
              name: indexed.name || 'Misafir',
              message: indexed.message || '',
              timestamp: indexed.timestamp || new Date(b.uploadedAt).getTime(),
            };
          }
          // Old photo without metadata — show as Misafir
          return {
            url: b.url,
            name: 'Misafir',
            message: '',
            timestamp: new Date(b.uploadedAt).getTime(),
          };
        });

      isBlobActive = true;
    } catch (err) {
      console.error("Blob error:", err.message);
    }
  }

  // Add memory fallback entries (development / no-blob fallback)
  const memPhotos = (global.photoStore || []).map(p =>
    typeof p === 'string'
      ? { url: p, name: 'Misafir', message: '', timestamp: 0 }
      : p
  );

  const combined = [...photos, ...memPhotos];

  // Deduplicate by URL
  const seen = new Set();
  const unique = combined.filter(p => {
    if (!p?.url || seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });

  const result = {
    photos: unique,
    diagnostics: {
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      isBlobActive,
      count: unique.length,
    },
  };

  cachedPhotos = result;
  lastPhotosFetch = now;

  return NextResponse.json(result);
}