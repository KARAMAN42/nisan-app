import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

global.guestbookStore = global.guestbookStore || [];

async function readJson(prefix, list) {
  try {
    const { blobs } = await list({ prefix, limit: 5 });
    if (!blobs.length) return null;
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    const res = await fetch(blobs[0].url + '?nc=' + Date.now());
    return await res.json();
  } catch { return null; }
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

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ entries: global.guestbookStore });
  }
  try {
    const { list } = await import('@vercel/blob');
    const data = await readJson('nisan-guestbook', list);
    return NextResponse.json({ entries: data || [] });
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
      name: name.trim().substring(0, 60),
      message: message.trim().substring(0, 300),
      timestamp: Date.now(),
    };
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      global.guestbookStore.unshift(entry);
      return NextResponse.json({ success: true, entry });
    }
    const { list, put, del } = await import('@vercel/blob');
    const current = await readJson('nisan-guestbook', list) || [];
    current.unshift(entry);
    await writeJson('nisan-guestbook.json', current, list, put, del);
    return NextResponse.json({ success: true, entry });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
