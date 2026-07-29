const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const token = env.split('\n').find(l => l.startsWith('BLOB_READ_WRITE_TOKEN')).split('=')[1].trim().replace(/"/g, '');
process.env.BLOB_READ_WRITE_TOKEN = token;
const { list } = require('@vercel/blob');
(async () => {
  try {
    const { blobs } = await list({ prefix: 'nisan-index' });
    console.log('Index blobs:', blobs.length);
    for (const b of blobs) {
      console.log(b.url);
      const res = await fetch(b.url + '?nc=' + Date.now());
      const text = await res.text();
      console.log('Content length:', text.length);
      console.log('Sample:', text.substring(0, 100));
    }
  } catch (e) {
    console.error(e);
  }
})();
