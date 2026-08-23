const https = require('https');

const columnsToTest = [
  'name', 'close', 'net_income', 'net_income_fy', 'net_income_fq',
  'fiscal_period', 'fiscal_year', 'earnings_release_date',
  'period_end_date', 'reporting_period', 'financial_year_end',
  'earnings_per_share_basic_ttm', 'price_earnings_ttm',
  'fundamental_currency_code', 'currency'
];

const postData = JSON.stringify({
  symbols: { tickers: ['EGX:AMOC', 'EGX:COPR', 'EGX:HRHO', 'EGX:ORAS'] },
  columns: columnsToTest
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
      console.log('Results count:', d.data?.length);
      for (const item of (d.data || [])) {
        console.log(`\n--- ${item.s} ---`);
        item.d.forEach((val, idx) => {
          console.log(`  ${columnsToTest[idx]}: ${val}`);
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
