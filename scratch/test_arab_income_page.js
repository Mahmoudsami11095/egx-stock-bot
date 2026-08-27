const https = require('https');

const url = 'https://www.tradingview.com/symbols/EGX-ARAB/financials-income-statement/';
https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  }
}, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    const regex = /<script type="application\/prs\.init-data\+json">([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(b)) !== null) {
      try {
        const d = JSON.parse(match[1]);
        for (const k of Object.keys(d)) {
          if (d[k]?.statements || d[k]?.report || d[k]?.financials || d[k]?.table) {
            console.log('Key:', k, JSON.stringify(d[k]).slice(0, 500));
          }
          if (JSON.stringify(d[k]).includes('630') || JSON.stringify(d[k]).includes('Q1') || JSON.stringify(d[k]).includes('netIncome') || JSON.stringify(d[k]).includes('net_income')) {
            console.log('Found statement data in:', k, JSON.stringify(d[k]).slice(0, 500));
          }
        }
      } catch(e) {}
    }
  });
});
