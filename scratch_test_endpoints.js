const https = require('https');

async function testEndpoint(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://stockastic.app',
        'Referer': 'https://stockastic.app/'
      }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        resolve({ url, status: res.statusCode, body: b.slice(0, 300) });
      });
    }).on('error', err => resolve({ url, error: err.message }));
  });
}

(async () => {
  const tests = [
    'https://authapi.stockastic.app/api/public/companies/MASR.EGX',
    'https://authapi.stockastic.app/api/companies/ticker/MASR.EGX/financial-reports?lang=ar',
    'https://authapi.stockastic.app/companies/ticker/MASR.EGX/financial-reports?lang=ar',
    'https://authapi.stockastic.app/api/analysis/trend/488',
    'https://analysisapi.stockastic.app/api/analysis/trend/488',
    'https://authapi.stockastic.app/api/analysis/488'
  ];

  for (const t of tests) {
    const res = await testEndpoint(t);
    console.log(res.status, res.url, '\n', res.body, '\n---');
  }
})();
