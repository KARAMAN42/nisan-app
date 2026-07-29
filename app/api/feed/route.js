import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

global.likesStore = global.likesStore || {};
global.commentsStore = global.commentsStore || {};
global.guestbookStore = global.guestbookStore || [];

let cachedIndexes = {};
let lastFetchTime = {};

async function readJson(prefix, list) {
  const now = Date.now();
  if (cachedIndexes[prefix] && (now - (lastFetchTime[prefix] || 0) < 15000)) {
    return cachedIndexes[prefix];
  }

  try {
    const { blobs } = await list({ prefix, limit: 5 });
    if (!blobs.length) return null;
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    // Use Next.js fetch caching instead of Date.now() cache busting
    const res = await fetch(blobs[0].url, { next: { revalidate: 15 } });
    if (!res.ok) return cachedIndexes[prefix] || null;
    const data = await res.json();
    cachedIndexes[prefix] = data;
    lastFetchTime[prefix] = now;
    return data;
  } catch (e) {
    return cachedIndexes[prefix] || null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const vid = searchParams.get('vid') || '';

  let photos = [];
  let likes = {};
  let comments = {};
  let guestbook = [];

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import('@vercel/blob');
      const [idx, lk, cm, gb] = await Promise.all([
        readJson('nisan-index', list),
        readJson('nisan-likes', list),
        readJson('nisan-comments', list),
        readJson('nisan-guestbook', list),
      ]);
      photos = (idx || []).filter(p => p?.url);
      likes = lk || {};
      comments = cm || {};
      guestbook = gb || [];
    } catch (e) { console.error('Feed error:', e.message); }
  } else {
    likes = global.likesStore;
    comments = global.commentsStore;
    guestbook = global.guestbookStore;
  }

  // Photo posts
  const photoPosts = photos.map(p => {
    const pl = likes[p.url] || [];
    const pc = comments[p.url] || [];
    return {
      type: 'photo',
      url: p.url,
      name: p.name || 'Misafir',
      message: p.message || '',
      timestamp: p.timestamp || 0,
      likeCount: pl.length,
      isLiked: vid ? pl.includes(vid) : false,
      commentCount: pc.length,
      comments: pc.slice(-20),
    };
  });

  // Guestbook posts
  const gbPosts = (guestbook || []).map(e => ({
    type: 'guestbook',
    name: e.name,
    message: e.message,
    timestamp: e.timestamp,
    likeCount: 0,
    isLiked: false,
    commentCount: 0,
    comments: [],
  }));

  // Combine: photo posts first (in original order), then guestbook interleaved by time
  const allPosts = [...photoPosts, ...gbPosts].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return NextResponse.json({ posts: allPosts });
}
