import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const photoUrls = [];
  let isBlobActive = false;

  // 1. Vercel Blob'dan fotoğrafları çekiyoruz
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list();

      // Private store olduğu için indirme/görüntüleme için url'leri doğrudan alıyoruz
      // Vercel Blob private url'leri otomatik yetkilendirme barındırır veya doğrudan sunulabilir
      const blobUrls = blobs.map(b => b.url);
      photoUrls.push(...blobUrls);
      isBlobActive = true;
    } catch (err) {
      console.error("Vercel Blob listeleme hatası:", err);
    }
  }

  // 2. Lokal dosya sistemi yedeği
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
    // Lokal dizin yoksa geç
  }

  const uniquePhotos = Array.from(new Set(photoUrls));

  return NextResponse.json({
    photos: uniquePhotos,
    diagnostics: {
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      isBlobActive: isBlobActive
    }
  });
}