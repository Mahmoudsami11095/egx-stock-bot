const https = require('https');

const url = 'https://www.tradingview.com/symbols/EGX-ARAB/financials-overview/';
https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  }
}, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    const regex = /<script type="application\/prs\.init-data\+json">([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(b)) !== null) {
      try {
        const d = JSON.parse(match[1]);
        const keys = Object.keys(d);
        for (const k of keys) {
          if (d[k]?.descriptions || d[k]?.initFinancialsQuotes) {
            console.log('Key with financials:', k);
            console.log(JSON.stringify(d[k], null, 2));
          }
        }
      } catch(e) {}
    }
  });
});
