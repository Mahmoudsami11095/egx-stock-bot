const https = require('https');

https.get('https://stockastic.app/assets/company-D4L7HxyN.js', (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    console.log('company chunk size:', b.length);
    const urls = b.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[a-zA-Z0-9/._-]*/g);
    console.log('URLs in company chunk:', [...new Set(urls || [])]);

    const apiRoutes = b.match(/\/api\/[a-zA-Z0-9/_.-]+/g);
    console.log('API routes in company chunk:', [...new Set(apiRoutes || [])]);

    const r2Matches = b.match(/r2\.dev\/[a-zA-Z0-9/_.-]+/g);
    console.log('R2 matches:', [...new Set(r2Matches || [])]);
    
    // Search for where financial statements or income statements are fetched
    let idx = 0;
    while ((idx = b.indexOf('financial', idx)) !== -1) {
      console.log('Context financial:', b.slice(Math.max(0, idx - 80), idx + 120));
      idx += 10;
    }
  });
});
