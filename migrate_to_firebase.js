const fs = require('fs');

// Load env
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) {
    envVars[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

process.env.BLOB_READ_WRITE_TOKEN = envVars.BLOB_READ_WRITE_TOKEN;
process.env.FIREBASE_PROJECT_ID = envVars.FIREBASE_PROJECT_ID;
process.env.FIREBASE_CLIENT_EMAIL = envVars.FIREBASE_CLIENT_EMAIL;
process.env.FIREBASE_PRIVATE_KEY = envVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
process.env.FIREBASE_STORAGE_BUCKET = envVars.FIREBASE_STORAGE_BUCKET;

async function migrate() {
  // Init Firebase Admin
  const { initializeApp, getApps, cert } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }

  const db = getFirestore();

  // Read old Vercel Blob index
  console.log('Vercel Blob indeksi okunuyor...');
  const { list } = require('@vercel/blob');
  
  let oldPhotos = [];
  try {
    const { blobs: indexBlobs } = await list({ prefix: 'nisan-index', limit: 10 });
    if (indexBlobs.length > 0) {
      indexBlobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      const res = await fetch(indexBlobs[0].url + '?nc=' + Date.now());
      oldPhotos = await res.json();
      console.log(`Vercel Blob'dan ${oldPhotos.length} eski fotoğraf bulundu.`);
    } else {
      console.log('Vercel Blob indeksinde fotoğraf bulunamadı.');
    }
  } catch (e) {
    console.log('Blob okuma hatası (store bloklanmış olabilir):', e.message);
    // Try listing blobs directly
    try {
      let allBlobs = [];
      let cursor;
      do {
        const res = await list({ prefix: 'nisan/', limit: 100, cursor });
        allBlobs = allBlobs.concat(res.blobs);
        cursor = res.cursor;
      } while (cursor);
      
      const imgBlobs = allBlobs.filter(b => /\.(jpg|jpeg|png|gif|webp|heic)(\?|$)/i.test(b.url));
      console.log(`Blob listesinden ${imgBlobs.length} fotoğraf bulundu.`);
      oldPhotos = imgBlobs.map(b => ({
        url: b.url,
        name: 'Misafir',
        message: '',
        timestamp: new Date(b.uploadedAt).getTime()
      }));
    } catch (e2) {
      console.log('Blob listeleme de başarısız:', e2.message);
    }
  }

  if (oldPhotos.length === 0) {
    console.log('Taşınacak eski fotoğraf bulunamadı.');
    return;
  }

  // Read current Firebase data
  console.log('Firebase mevcut veri okunuyor...');
  const feedRef = db.collection('appData').doc('feed');
  const doc = await feedRef.get();
  const currentPosts = doc.exists ? (doc.data().posts || []) : [];
  console.log(`Firebase'de mevcut ${currentPosts.length} post var.`);

  // Get existing URLs to avoid duplicates
  const existingUrls = new Set(currentPosts.map(p => p.url));

  // Map old photos to new format
  const newPosts = oldPhotos
    .filter(p => p && p.url && !existingUrls.has(p.url))
    .map(p => ({
      type: 'photo',
      url: p.url,
      name: p.name || 'Misafir',
      message: p.message || '',
      timestamp: p.timestamp || Date.now(),
      likes: [],
      comments: []
    }));

  console.log(`${newPosts.length} yeni fotoğraf Firebase'e eklenecek.`);

  if (newPosts.length === 0) {
    console.log('Eklenecek yeni fotoğraf yok (zaten taşınmış olabilir).');
    return;
  }

  // Merge old (append at end since they're older) with new (keep existing at top)
  const mergedPosts = [...currentPosts, ...newPosts].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  await feedRef.set({ posts: mergedPosts });
  console.log(`✅ Taşıma tamamlandı! Firebase'de toplam ${mergedPosts.length} post var.`);
}

migrate().catch(console.error);
