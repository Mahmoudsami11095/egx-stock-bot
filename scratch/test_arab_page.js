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
        for (const k of Object.keys(d)) {
          if (d[k]?.charts) {
            console.log('--- FOUND CHARTS in', k, '---');
            console.log(JSON.stringify(d[k].charts, null, 2));
          }
          const str = JSON.stringify(d[k]);
          if (str.includes('Performance') || str.includes('Growth') || str.includes('Quarterly') || str.includes('margin') || str.includes('netIncome') || str.includes('totalRevenue')) {
            console.log('--- KEY with financial metrics:', k);
            console.log(JSON.stringify(d[k], null, 2).slice(0, 2000));
          }
        }
      } catch(e) {
        console.log('Error parsing JSON:', e.message);
      }

    }
  });
});
