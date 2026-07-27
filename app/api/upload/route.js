import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

global.photoStore = global.photoStore || [];

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let images = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();
      
      // Handle both old format { image, filename } and new format { images: [...] }
      if (body.images && Array.isArray(body.images)) {
        images = body.images; // New multi-upload format
      } else if (body.image) {
        images = [{ dataUrl: body.image, filename: body.filename || 'foto.jpg' }]; // Old single format
      } else {
        return NextResponse.json({ error: "Fotoğraf verisi bulunamadı." }, { status: 400 });
      }
    } else {
      // FormData fallback
      const formData = await request.formData();
      const files = formData.getAll('photo');
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const mimeType = file.type || 'image/jpeg';
        images.push({
          dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
          filename: file.name || 'foto.jpg'
        });
      }
    }

    if (images.length === 0) {
      return NextResponse.json({ error: "Fotoğraf bulunamadı." }, { status: 400 });
    }

    const uploadedUrls = [];

    for (const { dataUrl, filename } of images) {
      // 1. Try Vercel Blob
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const { put } = await import('@vercel/blob');
          const base64Data = dataUrl.split(',')[1];
          const mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
          const buffer = Buffer.from(base64Data, 'base64');
          const safeFilename = `nisan/${Date.now()}-${(filename || 'foto.jpg').replace(/[^a-zA-Z0-9._-]/g, '')}`;
          
          const blob = await put(safeFilename, buffer, {
            access: 'public',
            contentType: mimeType,
          });
          
          uploadedUrls.push(blob.url);
          console.log("✅ Blob upload success:", blob.url);
          continue;
        } catch (blobErr) {
          console.error("❌ Blob error:", blobErr.message);
        }
      }

      // 2. Memory fallback
      global.photoStore.unshift(dataUrl);
      uploadedUrls.push(dataUrl);
    }

    return NextResponse.json({ 
      success: true, 
      url: uploadedUrls[0], // backward compat
      urls: uploadedUrls, 
      count: uploadedUrls.length 
    });

  } catch (error) {
    console.error("Upload handler error:", error);
    return NextResponse.json({ 
      error: "Yükleme sırasında bir hata oluştu: " + error.message 
    }, { status: 500 });
  }
}
