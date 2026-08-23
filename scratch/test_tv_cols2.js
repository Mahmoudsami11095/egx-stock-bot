const https = require('https');

const cols = [
  'name', 'close', 'net_income', 'net_income_fy', 'net_income_fq',
  'earnings_release_date', 'recent_earnings_date', 'next_earnings_date',
  'fiscal_year_end_date', 'fiscal_period_end_date',
  'earnings_per_share_fq', 'earnings_per_share_fy',
  'revenue_fq', 'revenue_fy', 'total_revenue'
];

const postData = JSON.stringify({
  symbols: { tickers: ['EGX:AMOC', 'EGX:COPR', 'EGX:HRHO', 'EGX:ORAS', 'EGX:TMGH'] },
  columns: cols
});

const req = https.request({
  hostname: 'scanner.tradingview.com',
  port: 443,
  path: `/egypt/scan?_ts=${Date.now()}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
}, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    try {
      const d = JSON.parse(b);
      for (const item of (d.data || [])) {
        console.log(`\n=== ${item.s} ===`);
        item.d.forEach((val, idx) => {
          if (val !== null && val !== undefined) {
            console.log(`  ${cols[idx]}: ${val}`);
          }
        });
      }
    } catch(e) {
      console.log('Error:', e.message);
    }
  });
});

req.on('error', e => console.error(e));
req.write(postData);
req.end();
