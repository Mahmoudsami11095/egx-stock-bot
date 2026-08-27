const https = require('https');

function testUrl(url) {
  return new Promise(resolve => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        resolve({ url, status: res.statusCode, length: b.length, body: b.slice(0, 200) });
      });
    }).on('error', e => resolve({ url, error: e.message }));
  });
}

async function run() {
  const urls = [
    'https://financials.tradingview.com/statements/EGX:ARAB/income-statement/quarterly',
    'https://financials.tradingview.com/statements/EGX:ARAB',
    'https://www.tradingview.com/api/v1/financials/overview/?symbol=EGX:ARAB',
    'https://www.tradingview.com/api/v1/symbols/EGX:ARAB/financials/',
    'https://scanner.tradingview.com/egypt/financials/EGX:ARAB',
    'https://scanner.tradingview.com/financials/data/EGX:ARAB'
  ];
  for (const u of urls) {
    const res = await testUrl(u);
    console.log(res.status, res.url, res.length > 0 ? res.body : '');
  }
}
run();
