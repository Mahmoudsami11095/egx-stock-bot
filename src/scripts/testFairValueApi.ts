import http from 'https';

function testFinancialColumns() {
  const postData = JSON.stringify({
    symbols: {
      tickers: [
        'EGX:ABUK',
        'EGX:AMOC',
        'EGX:MASR',
        'EGX:MICH',
        'EGX:MPCI',
        'EGX:OLFI',
        'EGX:ORAS',
        'EGX:ORWE',
        'EGX:SWDY',
        'EGX:EGAL',
        'EGX:SUGR',
        'EGX:SKPC'
      ]
    },
    columns: [
      'name',
      'close',
      'price_earnings_ttm',
      'earnings_per_share_basic_ttm',
      'price_book_ratio_fq',
      'price_52_week_high',
      'price_52_week_low',
      'SMA20',
      'SMA50',
      'RSI',
      'Recommend.All'
    ]
  });

  const options = {
    hostname: 'scanner.tradingview.com',
    port: 443,
    path: '/egypt/scan',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Mozilla/5.0'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('✅ TradingView Financial Columns Output:\n');
        for (const row of json.data || []) {
          const ticker = row.s;
          const [name, close, pe, eps, pb, high52, low52, sma20, sma50, rsi, recommend] = row.d;
          console.log(`Ticker: ${ticker} | Price: ${close} | P/E: ${pe} | EPS: ${eps} | P/B: ${pb} | 52wH: ${high52} | 52wL: ${low52} | Recommend: ${recommend}`);
        }
      } catch (err) {
        console.error('Error:', err);
      }
    });
  });

  req.write(postData);
  req.end();
}

testFinancialColumns();
