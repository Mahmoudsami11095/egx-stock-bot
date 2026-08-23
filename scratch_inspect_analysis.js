const https = require('https');

https.get('https://stockastic.app/assets/analysis-B_U3YXQr.js', (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    console.log('analysis chunk size:', b.length);
    // Find all fetch or axios or API calls
    const urls = b.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[a-zA-Z0-9/._-]*/g);
    console.log('URLs in analysis chunk:', [...new Set(urls || [])]);

    const apiRoutes = b.match(/\/api\/[a-zA-Z0-9/_.-]+/g);
    console.log('API routes in analysis chunk:', [...new Set(apiRoutes || [])]);
    
    // Look for R2 usage or endpoint template strings
    const r2Matches = b.match(/r2\.dev\/[a-zA-Z0-9/_.-]+/g);
    console.log('R2 matches:', [...new Set(r2Matches || [])]);
  });
});
