import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

global.photoStore = global.photoStore || [];

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];

function isImageBlob(b) {
  const p = (b.pathname || b.url || '').toLowerCase();
  return IMAGE_EXTS.some(ext => p.endsWith(ext));
}

function decodeB64(str) {
  try { return Buffer.from(str, 'base64').toString('utf8'); } catch { return str; }
}

export async function GET() {
  let photos = [];
  let isBlobActive = false;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import('@vercel/blob');

      // List ALL blobs — no prefix filter so old uploads are included too
      let allBlobs = [];
      let cursor;
      do {
        const res = await list({ limit: 1000, cursor });
        allBlobs = allBlobs.concat(res.blobs);
        cursor = res.cursor;
      } while (cursor);

      // Keep only image files
      const imgBlobs = allBlobs.filter(isImageBlob);

      photos = imgBlobs
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .map(b => {
          // Try new base64-encoded metadata first
          let name = 'Misafir';
          let message = '';
          if (b.metadata?.name) {
            name = decodeB64(b.metadata.name);
          } else if (b.metadata?.guestName) {
            name = b.metadata.guestName; // old camelCase format
          } else if (b.metadata?.guestname) {
            name = b.metadata.guestname;
          }
          if (b.metadata?.msg) {
            // Try base64 decode, fall back to raw
            message = decodeB64(b.metadata.msg);
          }
          return {
            url: b.url,
            name,
            message,
            timestamp: new Date(b.uploadedAt).getTime(),
          };
        });

      isBlobActive = true;
    } catch (err) {
      console.error("Blob list error:", err.message);
    }
  }

  // Add memory fallback entries
  const memPhotos = (global.photoStore || []).map(p =>
    typeof p === 'string'
      ? { url: p, name: 'Misafir', message: '', timestamp: 0 }
      : p
  );
  photos = [...photos, ...memPhotos];

  // Deduplicate by URL
  const seen = new Set();
  const unique = photos.filter(p => {
    if (seen.has(p.url)) return false;
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