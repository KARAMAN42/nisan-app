import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { photoUrl, name, text } = await request.json();
    if (!photoUrl || !text?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    
    const newComment = {
      name: (name || 'Misafir').trim().substring(0, 50),
      text: text.trim().substring(0, 200),
      timestamp: Date.now(),
    };

    const feedRef = db.collection('appData').doc('feed');
    
    await db.runTransaction(async (t) => {
      const doc = await t.get(feedRef);
      if (!doc.exists) return;
      
      const posts = doc.data().posts || [];
      const postIndex = posts.findIndex(p => p.url === photoUrl || (p.type === 'guestbook' && p.timestamp === photoUrl));
      
      if (postIndex !== -1) {
        const post = posts[postIndex];
        const comments = post.comments || [];
        post.comments = [...comments, newComment];
        posts[postIndex] = post;
        t.update(feedRef, { posts });
      }
    });

    return NextResponse.json({ success: true, comment: newComment });
  } catch (err) {
    console.error('Comment error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { photoUrl, timestamp } = await request.json();
    if (!photoUrl || !timestamp) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const feedRef = db.collection('appData').doc('feed');
    
    await db.runTransaction(async (t) => {
      const doc = await t.get(feedRef);
      if (!doc.exists) return;
      
      const posts = doc.data().posts || [];
      const postIndex = posts.findIndex(p => p.url === photoUrl || (p.type === 'guestbook' && p.timestamp === photoUrl));
      
      if (postIndex !== -1) {
        const post = posts[postIndex];
        const comments = post.comments || [];
        post.comments = comments.filter(c => c.timestamp !== timestamp);
        posts[postIndex] = post;
        t.update(feedRef, { posts });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete comment error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
