const https = require('https');

// Let's search inside the category_financials JS bundle for URLs or API endpoints
const url = 'https://static.tradingview.com/static/bundles/category_financials.45a36e2af75e18f15d57.js';
https.get(url, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    console.log('Bundle length:', b.length);
    const apiRegex = /["'](\/[^"']*(?:financial|statement|quote|chart|history|overview)[^"']*)["']/gi;
    let m;
    const apis = new Set();
    while ((m = apiRegex.exec(b)) !== null) {
      apis.add(m[1]);
    }
    console.log('APIs inside bundle:', [...apis].slice(0, 30));
  });
});
