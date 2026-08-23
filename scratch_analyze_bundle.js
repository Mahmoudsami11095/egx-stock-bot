const https = require('https');

https.get('https://stockastic.app/assets/index-Dg1QMrd4.js', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
}, (res) => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    console.log('Bundle size:', b.length);
    const urls = b.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[a-zA-Z0-9/._-]*/g);
    const uniqueUrls = [...new Set(urls || [])];
    console.log('Found URLs in bundle:', uniqueUrls.filter(u => !u.includes('w3.org') && !u.includes('google')));
    
    // Look for api routes
    const apiMatches = b.match(/\/api\/[a-zA-Z0-9/_.-]+/g);
    console.log('Found API routes in bundle:', [...new Set(apiMatches || [])]);
  });
});
