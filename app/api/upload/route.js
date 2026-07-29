import { NextResponse } from 'next/server';
import { db, bucket } from '../../../lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

    // Upload each image
    for (const { dataUrl, filename } of images) {
      const base64Data = dataUrl.split(',')[1];
      const mimeType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const ts = Date.now();
      const buffer = Buffer.from(base64Data, 'base64');
      
      const filePath = `nisan/${ts}_${Math.floor(Math.random()*1000)}.${ext}`;
      const file = bucket.file(filePath);
      
      await file.save(buffer, {
        contentType: mimeType,
      });

      // Get a long-lived signed URL to bypass security rules
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '01-01-2100'
      });

      uploadedPhotos.push({
        type: 'photo',
        url: url,
        name,
        message: msg,
        timestamp: ts,
        likes: [],
        comments: []
      });
    }

    // Add to Firestore using ArrayUnion to prepend/append
    const feedRef = db.collection('appData').doc('feed');
    
    // Using a transaction to ensure we prepend correctly or we can just read and write
    await db.runTransaction(async (t) => {
      const doc = await t.get(feedRef);
      if (!doc.exists) {
        t.set(feedRef, { posts: uploadedPhotos });
      } else {
        const currentPosts = doc.data().posts || [];
        t.update(feedRef, { posts: [...uploadedPhotos, ...currentPosts] });
      }
    });

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
