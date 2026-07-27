import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

global.likesStore = global.likesStore || {};
global.commentsStore = global.commentsStore || {};

async function readJson(prefix, list) {
  try {
    const { blobs } = await list({ prefix, limit: 5 });
    if (!blobs.length) return null;
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    const res = await fetch(blobs[0].url + '?nc=' + Date.now());
    return await res.json();
  } catch { return null; }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const vid = searchParams.get('vid') || '';

  let photos = [];
  let likes = {};
  let comments = {};

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import('@vercel/blob');
      const [idx, lk, cm] = await Promise.all([
        readJson('nisan-index', list),
        readJson('nisan-likes', list),
        readJson('nisan-comments', list),
      ]);
      photos = (idx || []).filter(p => p?.url);
      likes = lk || {};
      comments = cm || {};
    } catch (e) { console.error('Feed error:', e.message); }
  } else {
    likes = global.likesStore;
    comments = global.commentsStore;
  }

  const posts = photos.map(p => {
    const pl = likes[p.url] || [];
    const pc = comments[p.url] || [];
    return {
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

  return NextResponse.json({ posts });
}
