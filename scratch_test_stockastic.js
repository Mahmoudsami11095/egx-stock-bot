const https = require('https');

async function testFetchCompany(symbol) {
  return new Promise((resolve) => {
    https.get(`https://authapi.stockastic.app/api/public/companies/${symbol}.EGX`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(b));
        } catch(e) {
          resolve({ error: e.message, raw: b.slice(0, 100) });
        }
      });
    }).on('error', err => resolve({ error: err.message }));
  });
}

(async () => {
  const masr = await testFetchCompany('MASR');
  console.log('MASR Profile:', masr);
})();
