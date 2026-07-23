import http from 'https';

function fetchTradingViewData() {
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
      'change',
      'volume',
      'average_volume_30d_calc',
      'high',
      'low',
      'price_52_week_high',
      'price_52_week_low',
      'RSI',
      'SMA20',
      'SMA50'
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
        console.log('✅ TradingView EGX Scanner Response:\n');
        for (const row of json.data || []) {
          const ticker = row.s; // e.g. EGX:SWDY
          const [name, close, change, volume, avgVol, high, low, high52, low52, rsi, sma20, sma50] = row.d;
          console.log(`Ticker: ${ticker} | Price: ${close} EGP | Change: ${change?.toFixed(2)}% | RSI: ${rsi?.toFixed(2)} | SMA20: ${sma20?.toFixed(2)} | SMA50: ${sma50?.toFixed(2)}`);
        }
      } catch (err) {
        console.error('Error parsing response:', err, data);
      }
    });
  });

  req.on('error', (e) => console.error('Request error:', e));
  req.write(postData);
  req.end();
}

fetchTradingViewData();
