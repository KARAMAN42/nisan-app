import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

global.cloudPhotos = global.cloudPhotos || [];

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file) {
      return NextResponse.json({ error: "Fotoğraf bulunamadı." }, { status: 400 });
    }

    // 1. Vercel Blob Depolama (Kalıcı Yükleme)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import('@vercel/blob');
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const blob = await put(filename, file, { access: 'public' });

        // URL'i belleğe de ekleyelim ki listede hemen görünsün
        global.cloudPhotos.unshift(blob.url);

        return NextResponse.json({ success: true, url: blob.url });
      } catch (blobErr) {
        console.error("Vercel Blob hatası:", blobErr);
      }
    }

    // 2. Lokal Geliştirme (Yalnızca PC ortamında çalışır)
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = path.join(process.cwd(), 'public/uploads');

      await fs.access(uploadDir).catch(async () => {
        await fs.mkdir(uploadDir, { recursive: true });
      });

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const filepath = path.join(uploadDir, filename);

      await fs.writeFile(filepath, buffer);

      const localUrl = `/uploads/${filename}`;
      global.cloudPhotos.unshift(localUrl);
      return NextResponse.json({ success: true, url: localUrl });
    } catch (fsErr) {
      console.error("Lokal yazma hatası:", fsErr);
    }

    return NextResponse.json({ error: "Fotoğraf kalıcı olarak depolanamadı." }, { status: 500 });

  } catch (error) {
    console.error("Upload handler hatası:", error);
    return NextResponse.json({ error: "Yükleme sırasında bir hata oluştu." }, { status: 500 });
  }
}