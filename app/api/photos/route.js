import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

global.photoStore = global.photoStore || [];

export async function GET() {
  const photoUrls = [];
  let isBlobActive = false;

  // 1. Fetch from Vercel Blob if token exists
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list();
      photoUrls.push(...blobs.map(b => b.url));
      isBlobActive = blobs !== undefined;
    } catch (err) {
      console.error("Blob list error:", err.message);
    }
  }

  // 2. Add in-memory photos (fallback)
  if (global.photoStore && global.photoStore.length > 0) {
    photoUrls.push(...global.photoStore);
  }

  const uniquePhotos = Array.from(new Set(photoUrls));

  return NextResponse.json({
    photos: uniquePhotos,
    diagnostics: {
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      isBlobActive,
      memoryCount: global.photoStore?.length || 0,
    }
  });
}