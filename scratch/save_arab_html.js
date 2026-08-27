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
    const fs = require('fs');
    fs.writeFileSync('scratch/arab_overview.html', b, 'utf-8');
    console.log('Saved scratch/arab_overview.html (length ' + b.length + ')');
  });
});
