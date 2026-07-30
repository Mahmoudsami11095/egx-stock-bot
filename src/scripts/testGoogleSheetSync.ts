import https from 'https';

function testGoogleSheetSync() {
  const webhookUrl = 'https://script.google.com/macros/s/AKfycbz7QaHLl3lQhPfYdyjQG6ZAc1e0C3bNj7O7XXn5caUFPknyvOaEE7wdtn_1sDxV7bAJ/exec';

  const payload = JSON.stringify({
    sheetId: '17anSf-cjckoBaV3jhBD5IscwxONGKu79W3ekTSq8lck',
    timestamp: new Date().toLocaleString('ar-EG'),
    stocks: [
      {
        symbol: 'MPCI',
        nameAr: 'ممفيس للأدوية',
        currentPrice: 294,
        changePercent: 1.03,
        fairValue: 310,
        fairValueUpsidePercent: 5.44,
        signalType: 'BUY',
        rsi: 48,
        sma20: 285,
        sma50: 270,
        support: 280,
        resistance: 300,
        entryMin: 285,
        entryMax: 295,
        target1: 300,
        target2: 310,
        stopLoss: 275,
        shariaStatus: 'Halal - Sharia Compliant'
      },
      {
        symbol: 'SWDY',
        nameAr: 'السويدى إليكتريك',
        currentPrice: 94.95,
        changePercent: -0.49,
        fairValue: 115,
        fairValueUpsidePercent: 21.12,
        signalType: 'BUY',
        rsi: 52,
        sma20: 92,
        sma50: 88,
        support: 90,
        resistance: 100,
        entryMin: 92,
        entryMax: 95,
        target1: 105,
        target2: 115,
        stopLoss: 88,
        shariaStatus: 'Halal - Sharia Compliant'
      }
    ]
  });

  console.log('🚀 Sending test POST payload to user Google Sheet Webhook...');

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  // Google Apps Script redirects HTTP POST with 302
  function makeRequest(urlStr: string) {
    const u = new URL(urlStr);
    const reqOptions = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(reqOptions, (res) => {
      console.log(`HTTP Status: ${res.statusCode}`);
      if (res.statusCode === 302 || res.statusCode === 301) {
        console.log(`Following redirect to: ${res.headers.location}`);
        https.get(res.headers.location!, (res2) => {
          let body = '';
          res2.on('data', (chunk) => (body += chunk));
          res2.on('end', () => console.log('✅ Response:', body));
        });
      } else {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => console.log('✅ Response:', body));
      }
    });

    req.write(payload);
    req.end();
  }

  makeRequest(webhookUrl);
}

testGoogleSheetSync();
