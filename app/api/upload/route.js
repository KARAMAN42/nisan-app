import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

global.photoStore = global.photoStore || [];

export async function POST(request) {
  try {
    const body = await request.json();
    const { images, guestName, message } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "Fotoğraf verisi bulunamadı." }, { status: 400 });
    }

    const uploadedPhotos = [];

    for (const { dataUrl, filename } of images) {
      // 1. Try Vercel Blob with metadata
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const { put } = await import('@vercel/blob');
          const base64Data = dataUrl.split(',')[1];
          const mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
          const buffer = Buffer.from(base64Data, 'base64');
          const safeFilename = `nisan/photos/${Date.now()}-${(filename || 'foto.jpg').replace(/[^a-zA-Z0-9._-]/g, '')}`;

          const blob = await put(safeFilename, buffer, {
            access: 'public',
            contentType: mimeType,
            metadata: {
              guestName: (guestName || 'Misafir').substring(0, 60),
              msg: (message || '').substring(0, 200),
              ts: String(Date.now()),
            },
          });

          uploadedPhotos.push({
            url: blob.url,
            name: guestName || 'Misafir',
            message: message || '',
            timestamp: Date.now(),
          });
          continue;
        } catch (blobErr) {
          console.error("Blob upload error:", blobErr.message);
        }
      }

      // 2. Memory fallback
      const entry = {
        url: dataUrl,
        name: guestName || 'Misafir',
        message: message || '',
        timestamp: Date.now(),
      };
      global.photoStore.unshift(entry);
      uploadedPhotos.push(entry);
    }

    return NextResponse.json({
      success: true,
      count: uploadedPhotos.length,
      url: uploadedPhotos[0]?.url,
      urls: uploadedPhotos.map(p => p.url),
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Yükleme hatası: " + error.message }, { status: 500 });
  }
}
