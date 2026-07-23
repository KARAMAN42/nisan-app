import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Only return the keys to protect security secrets, but verify if the token exists
  const envKeys = Object.keys(process.env);
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  
  return NextResponse.json({
    keys: envKeys,
    hasBlobToken: hasBlobToken,
    blobTokenPrefix: process.env.BLOB_READ_WRITE_TOKEN ? process.env.BLOB_READ_WRITE_TOKEN.substring(0, 10) + '...' : null
  });
}
