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

    const name = (guestName || 'Misafir').trim().substring(0, 60);
    const msg = (message || '').trim().substring(0, 200);
    const uploadedPhotos = [];

    for (const { dataUrl, filename } of images) {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const { put } = await import('@vercel/blob');
          const base64Data = dataUrl.split(',')[1];
          const mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
          const ext = mimeType.includes('png') ? 'png' : 'jpg';
          const ts = Date.now();
          // Encode name as ASCII-safe for metadata (base64)
          const encodedName = Buffer.from(name, 'utf8').toString('base64');
          const encodedMsg = Buffer.from(msg, 'utf8').toString('base64');
          const blobPath = `nisan/${ts}.${ext}`;
          const buffer = Buffer.from(base64Data, 'base64');

          const blob = await put(blobPath, buffer, {
            access: 'public',
            contentType: mimeType,
            metadata: {
              // lowercase keys, base64-encoded values to avoid Turkish char issues
              name: encodedName,
              msg: encodedMsg,
              ts: String(ts),
            },
          });

          uploadedPhotos.push({
            url: blob.url,
            name,
            message: msg,
            timestamp: ts,
          });
          continue;
        } catch (blobErr) {
          console.error("Blob upload error:", blobErr.message);
        }
      }

      // Memory fallback
      const entry = { url: dataUrl, name, message: msg, timestamp: Date.now() };
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
