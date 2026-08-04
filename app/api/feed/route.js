import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';

export const dynamic = 'force-dynamic';
export const revalidate = 5;

let cachedPosts = null;
let lastFetchTime = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const vid = searchParams.get('vid') || '';

  try {
    const now = Date.now();
    let posts = cachedPosts;
    
    if (!posts || (now - lastFetchTime > 5000)) {
      const doc = await db.collection('appData').doc('feed').get();
      const data = doc.exists ? doc.data() : { posts: [] };
      posts = data.posts || [];
      cachedPosts = posts;
      lastFetchTime = now;
    }

    
    // Map to include user-specific isLiked flag and session grouping fields
    const mappedPosts = posts.map(p => {
      const pl = p.likes || [];
      const pc = p.comments || [];
      return {
        type: p.type || 'photo',
        url: p.url || '',
        name: p.name || 'Misafir',
        message: p.message || '',
        timestamp: p.timestamp || 0,
        sessionId: p.sessionId || null,
        sessionTimestamp: p.sessionTimestamp || p.timestamp || 0,
        likeCount: pl.length,
        isLiked: vid ? pl.includes(vid) : false,
        commentCount: pc.length,
        comments: pc.slice(-20),
      };
    });

    return NextResponse.json({ posts: mappedPosts.sort((a, b) => b.timestamp - a.timestamp) });
  } catch (error) {
    console.error('Feed error:', error);
    return NextResponse.json({ posts: [] });
  }
}
