import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

global.photoStore = global.photoStore || [];

// ─── Vercel Blob index helpers ───
async function readIndex(list) {
  try {
    const { blobs } = await list({ prefix: 'nisan-index', limit: 20 });
    if (!blobs.length) return [];
    // Sort newest first, use the latest
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    const res = await fetch(blobs[0].url, { next: { revalidate: 0 } });
    return await res.json();
  } catch {
    return [];
  }
}

async function writeIndex(entries, list, put, del) {
  try {
    // Remove all old index blobs first
    const { blobs } = await list({ prefix: 'nisan-index', limit: 20 });
    if (blobs.length > 0) {
      await del(blobs.map(b => b.url));
    }
    // Write updated index
    await put('nisan-index.json', JSON.stringify(entries, null, 0), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
  } catch (e) {
    console.error('writeIndex error:', e.message);
  }
}

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

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put, list, del } = await import('@vercel/blob');

        // Upload each image
        for (const { dataUrl, filename } of images) {
          const base64Data = dataUrl.split(',')[1];
          const mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
          const ext = mimeType.includes('png') ? 'png' : 'jpg';
          const ts = Date.now();
          const buffer = Buffer.from(base64Data, 'base64');

          const blob = await put(`nisan/${ts}.${ext}`, buffer, {
            access: 'public',
            contentType: mimeType,
            addRandomSuffix: true,
          });

          uploadedPhotos.push({
            url: blob.url,
            name,
            message: msg,
            timestamp: ts,
          });
        }

        // Update the index with new entries prepended
        const current = await readIndex(list);
        const updated = [...uploadedPhotos, ...current];
        await writeIndex(updated, list, put, del);

        return NextResponse.json({
          success: true,
          count: uploadedPhotos.length,
          url: uploadedPhotos[0]?.url,
          urls: uploadedPhotos.map(p => p.url),
        });
      } catch (blobErr) {
        console.error("Blob error:", blobErr.message);
      }
    }

    // Memory fallback
    for (const { dataUrl, filename } of images) {
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
