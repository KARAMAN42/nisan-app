import { NextResponse } from 'next/server';
import { db, bucket } from '../../../../lib/firebase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const items = body.items || (body.url ? [{ url: body.url, timestamp: body.timestamp }] : []);
    
    if (items.length === 0) return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });

    const feedRef = db.collection('appData').doc('feed');
    
    await db.runTransaction(async (t) => {
      const doc = await t.get(feedRef);
      if (!doc.exists) return;
      const posts = doc.data().posts || [];
      
      const toRemove = new Set(items.map(i => i.url + '_' + i.timestamp));
      const updatedPosts = posts.filter(p => !toRemove.has(p.url + '_' + p.timestamp));
      
      t.update(feedRef, { posts: updatedPosts });
    });

    // Sadece Firebase depolama alanındaki dosyaları eşzamanlı olarak fiziksel olarak sil
    const storagePromises = items.map(async (item) => {
      const url = item.url || '';
      if (url.includes('firebasestorage.app') || url.includes('storage.googleapis.com') || url.includes('firebase')) {
        try {
          const urlObj = new URL(url);
          const match = urlObj.pathname.match(/(nisan\/[^?]+)/);
          if (match && match[1]) {
             const filePath = decodeURIComponent(match[1]);
             await bucket.file(filePath).delete();
          }
        } catch (err) {
          // Dosya zaten silinmişse veya yoksa hatayı yoksay
        }
      }
    });

    await Promise.allSettled(storagePromises);

    return NextResponse.json({ success: true, deletedCount: items.length });
  } catch (error) {
    console.error("Silme hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
