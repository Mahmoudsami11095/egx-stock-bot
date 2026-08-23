const https = require('https');

https.get('https://stockastic.app/assets/index-Dg1QMrd4.js', (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    let idx = 0;
    while ((idx = b.indexOf('/companies/', idx)) !== -1) {
      console.log('Context around /companies/:', b.slice(Math.max(0, idx - 100), idx + 200));
      idx += 11;
    }
  });
});
