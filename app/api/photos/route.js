import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

global.cloudPhotos = global.cloudPhotos || [];

export async function GET() {
  const photoUrls = [];
  let isBlobActive = false;

  // 1. Fetch from Vercel Blob if available
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list();
      const blobUrls = blobs.map(b => b.url);
      photoUrls.push(...blobUrls);
      isBlobActive = true;
    } catch (err) {
      console.error("Error listing Vercel Blobs:", err);
    }
  }

  // 2. Fetch from local filesystem (if accessible)
  try {
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    await fs.access(uploadDir);
    const files = await fs.readdir(uploadDir);

    const fileStats = await Promise.all(
      files.map(async (filename) => {
        const stats = await fs.stat(path.join(uploadDir, filename));
        return {
          url: `/uploads/${filename}`,
          time: stats.mtime.getTime()
        };
      })
    );

    fileStats.sort((a, b) => b.time - a.time);
    photoUrls.push(...fileStats.map(f => f.url));
  } catch (fsErr) {
    // Local directory doesn't exist or is inaccessible
  }

  // 3. Append global cloud memory fallbacks
  if (global.cloudPhotos && global.cloudPhotos.length > 0) {
    photoUrls.push(...global.cloudPhotos);
  }

  // Remove duplicates while keeping order
  const uniquePhotos = Array.from(new Set(photoUrls));

  return NextResponse.json({
    photos: uniquePhotos,
    diagnostics: {
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      isBlobActive: isBlobActive
    }
  });
}
