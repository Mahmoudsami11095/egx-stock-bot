const https = require('https');

const endpoints = [
  '/api/bff/egx/market-watch?Page=1&PageSize=5&SortBy=value&SortDescending=true',
  '/api/bff/egx/company-details?isin=EGS380P1C010',
  '/api/bff/egx/company-profile?isin=EGS380P1C010',
  '/api/bff/egx/disclosures?Page=1&PageSize=10',
  '/api/bff/egx/disclosures?isin=EGS380P1C010',
  '/api/bff/egx/financials?isin=EGS380P1C010'
];

endpoints.forEach(ep => {
  https.get(`https://beta.egx.com.eg${ep}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://beta.egx.com.eg/en/market/market-watch'
    }
  }, res => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
      console.log(`\nEndpoint: ${ep} | Status: ${res.statusCode}`);
      console.log(b.slice(0, 200));
    });
  }).on('error', e => console.error(ep, e.message));
});
