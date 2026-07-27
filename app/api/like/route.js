import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

global.likesStore = global.likesStore || {};

async function readJson(prefix, list) {
  try {
    const { blobs } = await list({ prefix, limit: 5 });
    if (!blobs.length) return {};
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    const res = await fetch(blobs[0].url + '?nc=' + Date.now());
    return await res.json();
  } catch { return {}; }
}

async function writeJson(pathname, data, list, put, del) {
  try {
    const prefix = pathname.replace('.json', '');
    const { blobs } = await list({ prefix, limit: 10 });
    if (blobs.length) await del(blobs.map(b => b.url));
    await put(pathname, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
  } catch (e) { console.error('writeJson error:', e.message); }
}

export async function POST(request) {
  try {
    const { photoUrl, visitorId } = await request.json();
    if (!photoUrl || !visitorId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const pl = global.likesStore[photoUrl] || [];
      const already = pl.includes(visitorId);
      global.likesStore[photoUrl] = already
        ? pl.filter(id => id !== visitorId)
        : [...pl, visitorId];
      return NextResponse.json({
        liked: !already,
        likeCount: global.likesStore[photoUrl].length,
      });
    }

    const { list, put, del } = await import('@vercel/blob');
    const likes = await readJson('nisan-likes', list);
    const pl = likes[photoUrl] || [];
    const already = pl.includes(visitorId);
    likes[photoUrl] = already
      ? pl.filter(id => id !== visitorId)
      : [...pl, visitorId];
    await writeJson('nisan-likes.json', likes, list, put, del);

    return NextResponse.json({ liked: !already, likeCount: likes[photoUrl].length });
  } catch (err) {
    console.error('Like error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
