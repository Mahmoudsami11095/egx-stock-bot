const https = require('https');

// Let's test standard TradingView financial time series endpoints
const endpoints = [
  'https://scanner.tradingview.com/egypt/scan',
  'https://financials.tradingview.com/v1/historical/EGX:ARAB',
  'https://financials.tradingview.com/financials/EGX:ARAB',
  'https://scanner.tradingview.com/financials/EGX:ARAB'
];

function testPost(postData) {
  const req = https.request({
    hostname: 'scanner.tradingview.com',
    port: 443,
    path: '/egypt/scan',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Mozilla/5.0'
    }
  }, res => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
      console.log('Scanner status:', res.statusCode);
      try {
        const j = JSON.parse(b);
        console.log('Scanner response:', j.data?.[0]?.d);
      } catch(e) {
        console.log('Body:', b.slice(0, 300));
      }
    });
  });
  req.write(postData);
  req.end();
}

// Let's test scanner with quarterly fields or specific fields
testPost(JSON.stringify({
  symbols: { tickers: ['EGX:ARAB'] },
  columns: [
    'name', 'close', 'net_income', 'net_income_fq', 'total_revenue', 'total_revenue_fq',
    'net_margin', 'net_margin_fq', 'earnings_per_share_fq', 'gross_profit_fq'
  ]
}));
