import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

global.photoStore = global.photoStore || [];

export async function GET() {
  let photos = [];
  let isBlobActive = false;

  // 1. Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list({ prefix: 'nisan/photos/' });

      photos = blobs
        .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
        .map(b => ({
          url: b.url,
          name: b.metadata?.guestName || 'Misafir',
          message: b.metadata?.msg || '',
          timestamp: new Date(b.uploadedAt).getTime(),
        }));

      isBlobActive = true;
    } catch (err) {
      console.error("Blob list error:", err.message);
    }
  }

  // 2. Memory fallback (normalize old string entries)
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
    seen.add(p.url);
    return true;
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