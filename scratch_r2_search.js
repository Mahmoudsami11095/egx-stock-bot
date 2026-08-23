const https = require('https');

https.get('https://stockastic.app/assets/index-Dg1QMrd4.js', (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    const idx = b.indexOf('pub-5c5381d607eb45eb8caa35b3230d6433.r2.dev');
    if (idx !== -1) {
      console.log('Context around R2 URL:');
      console.log(b.slice(Math.max(0, idx - 200), idx + 300));
    }
  });
});
