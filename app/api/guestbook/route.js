import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const doc = await db.collection('appData').doc('feed').get();
    const data = doc.exists ? doc.data() : { posts: [] };
    const posts = data.posts || [];
    const guestbookEntries = posts.filter(p => p.type === 'guestbook');
    return NextResponse.json({ entries: guestbookEntries });
  } catch (e) {
    return NextResponse.json({ entries: [] });
  }
}

export async function POST(request) {
  try {
    const { name, message } = await request.json();
    if (!name?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'İsim ve mesaj zorunludur.' }, { status: 400 });
    }
    
    const entry = {
      type: 'guestbook',
      name: name.trim().substring(0, 60),
      message: message.trim().substring(0, 300),
      timestamp: Date.now(),
      likes: [],
      comments: []
    };

    const feedRef = db.collection('appData').doc('feed');
    
    await db.runTransaction(async (t) => {
      const doc = await t.get(feedRef);
      if (!doc.exists) {
        t.set(feedRef, { posts: [entry] });
      } else {
        const posts = doc.data().posts || [];
        t.update(feedRef, { posts: [entry, ...posts] });
      }
    });

    return NextResponse.json({ success: true, entry });
  } catch (e) {
    console.error('Guestbook post error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
