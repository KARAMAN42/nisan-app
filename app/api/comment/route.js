import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

global.commentsStore = global.commentsStore || {};

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
      access: 'public', addRandomSuffix: false, contentType: 'application/json',
    });
  } catch (e) { console.error('writeJson error:', e.message); }
}

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
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      if (!global.commentsStore[photoUrl]) global.commentsStore[photoUrl] = [];
      global.commentsStore[photoUrl].push(newComment);
      return NextResponse.json({ success: true, comment: newComment });
    }
    const { list, put, del } = await import('@vercel/blob');
    const comments = await readJson('nisan-comments', list);
    if (!comments[photoUrl]) comments[photoUrl] = [];
    comments[photoUrl].push(newComment);
    await writeJson('nisan-comments.json', comments, list, put, del);
    return NextResponse.json({ success: true, comment: newComment });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { photoUrl, timestamp } = await request.json();
    if (!photoUrl || !timestamp) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      if (global.commentsStore[photoUrl]) {
        global.commentsStore[photoUrl] = global.commentsStore[photoUrl].filter(
          c => c.timestamp !== timestamp
        );
      }
      return NextResponse.json({ success: true });
    }
    const { list, put, del } = await import('@vercel/blob');
    const comments = await readJson('nisan-comments', list);
    if (comments[photoUrl]) {
      comments[photoUrl] = comments[photoUrl].filter(c => c.timestamp !== timestamp);
    }
    await writeJson('nisan-comments.json', comments, list, put, del);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
