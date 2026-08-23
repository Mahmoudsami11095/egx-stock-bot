const https = require('https');

https.get('https://stockastic.app/assets/index-Dg1QMrd4.js', (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    // Find all chunks referenced in the bundle
    const chunks = b.match(/\/assets\/[a-zA-Z0-9_-]+\.js/g);
    console.log('All JS chunks in bundle:', [...new Set(chunks || [])]);

    // Search for ha + or R2 references
    let regex = /ha\s*\+\s*["'`][^"'`]+["'`]/g;
    let match;
    while ((match = regex.exec(b)) !== null) {
      console.log('Match ha + string:', match[0]);
    }
  });
});
