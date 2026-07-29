import { NextResponse } from 'next/server';
import { db, bucket } from '../../../../lib/firebase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { url, timestamp } = await request.json();
    if (!url) return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });

    const feedRef = db.collection('appData').doc('feed');
    
    await db.runTransaction(async (t) => {
      const doc = await t.get(feedRef);
      if (!doc.exists) return;
      const posts = doc.data().posts || [];
      const updatedPosts = posts.filter(p => !(p.url === url || (p.type === 'guestbook' && p.timestamp === timestamp)));
      t.update(feedRef, { posts: updatedPosts });
    });

    // Sadece Firebase depolama alanındaki dosyaları fiziksel olarak silmeyi deneriz
    // Vercel Blob'dakiler sadece veritabanından silinir
    if (url.includes('firebasestorage.app') || url.includes('storage.googleapis.com') || url.includes('firebase')) {
      try {
        const urlObj = new URL(url);
        // Genellikle URL içinde 'nisan/dosya.jpg' kısmı dosya yoludur
        const match = urlObj.pathname.match(/(nisan\/[^?]+)/);
        if (match && match[1]) {
           const filePath = decodeURIComponent(match[1]);
           await bucket.file(filePath).delete();
        }
      } catch (err) {
        console.error("Depolama silme hatası:", err.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Silme hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
