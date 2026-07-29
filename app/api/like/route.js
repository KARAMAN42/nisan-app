import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { photoUrl, visitorId } = await request.json();
    if (!photoUrl || !visitorId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const feedRef = db.collection('appData').doc('feed');
    let liked = false;
    let likeCount = 0;

    await db.runTransaction(async (t) => {
      const doc = await t.get(feedRef);
      if (!doc.exists) return;
      
      const posts = doc.data().posts || [];
      const postIndex = posts.findIndex(p => p.url === photoUrl || (p.type === 'guestbook' && p.timestamp === photoUrl));
      
      if (postIndex !== -1) {
        const post = posts[postIndex];
        const likes = post.likes || [];
        const already = likes.includes(visitorId);
        
        if (already) {
          post.likes = likes.filter(id => id !== visitorId);
          liked = false;
        } else {
          post.likes = [...likes, visitorId];
          liked = true;
        }
        likeCount = post.likes.length;
        posts[postIndex] = post;
        
        t.update(feedRef, { posts });
      }
    });

    return NextResponse.json({ liked, likeCount });
  } catch (err) {
    console.error('Like error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
