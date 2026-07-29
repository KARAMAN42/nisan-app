import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envKeys = Object.keys(process.env);
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  
  let indexData = null;
  let blobsList = [];
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: 'nisan-index', limit: 10 });
    blobsList = blobs;
    if (blobs.length > 0) {
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      const res = await fetch(blobs[0].url + '?nc=' + Date.now());
      indexData = await res.json();
    }
  } catch (e) {
    indexData = { error: e.message };
  }

  return NextResponse.json({
    keys: envKeys,
    hasBlobToken: hasBlobToken,
    blobTokenPrefix: process.env.BLOB_READ_WRITE_TOKEN ? process.env.BLOB_READ_WRITE_TOKEN.substring(0, 10) + '...' : null,
    blobsList,
    indexData,
  });
}
