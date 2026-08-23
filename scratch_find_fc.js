const https = require('https');

https.get('https://stockastic.app/assets/company-D4L7HxyN.js', (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    let idx = 0;
    while ((idx = b.indexOf('financial_comparison', idx)) !== -1) {
      console.log('Context financial_comparison:', b.slice(Math.max(0, idx - 150), idx + 250));
      idx += 20;
    }
  });
});
