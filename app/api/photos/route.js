import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase';

export const dynamic = 'force-dynamic';

let cachedPhotos = null;
let lastPhotosFetch = 0;

export async function GET() {
  try {
    const now = Date.now();
    let photos = cachedPhotos;

    if (!photos || (now - lastPhotosFetch > 5000)) {
      const doc = await db.collection('appData').doc('feed').get();
      const data = doc.exists ? doc.data() : { posts: [] };
      const posts = data.posts || [];
      photos = posts.filter(p => p.type === 'photo' || !p.type).map(p => ({
        url: p.url,
        name: p.name || 'Misafir',
        message: p.message || '',
        timestamp: p.timestamp || 0
      }));
      cachedPhotos = photos;
      lastPhotosFetch = now;
    }


    return NextResponse.json({
      photos: photos.sort((a, b) => b.timestamp - a.timestamp),
      diagnostics: {
        hasBlobToken: true,
        isBlobActive: true,
        count: photos.length,
      },
    });
  } catch (error) {
    console.error('Photos error:', error);
    return NextResponse.json({ photos: [], diagnostics: { error: error.message } });
  }
}