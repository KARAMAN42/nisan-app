import { NextResponse } from 'next/server';
import { db, bucket } from '../../../lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get Firebase Storage usage
    const [files] = await bucket.getFiles({ prefix: 'nisan/' });
    
    let totalBytes = 0;
    let fileCount = 0;
    
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      totalBytes += parseInt(metadata.size || 0);
      fileCount++;
    }

    // Get Firestore document count
    const feedDoc = await db.collection('appData').doc('feed').get();
    const feedData = feedDoc.exists ? feedDoc.data() : { posts: [] };
    const posts = feedData.posts || [];
    const photoCount = posts.filter(p => p.type === 'photo' || !p.type).length;
    const guestbookCount = posts.filter(p => p.type === 'guestbook').length;
    const totalComments = posts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);

    // Firebase free tier limits
    const FREE_STORAGE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
    const storagePercent = (totalBytes / FREE_STORAGE_BYTES) * 100;

    return NextResponse.json({
      storage: {
        usedBytes: totalBytes,
        usedMB: (totalBytes / (1024 * 1024)).toFixed(2),
        usedGB: (totalBytes / (1024 * 1024 * 1024)).toFixed(4),
        limitGB: 5,
        percent: storagePercent.toFixed(2),
        fileCount,
      },
      firestore: {
        photoCount,
        guestbookCount,
        totalComments,
        totalLikes,
        totalPosts: posts.length,
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
