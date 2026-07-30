import http from 'https';
import { INITIAL_STOCKS } from '../constants/stocks';

function testBatchScan() {
  const tickers = INITIAL_STOCKS.map((s) => `EGX:${s.symbol.toUpperCase()}`);

  const postData = JSON.stringify({
    symbols: {
      tickers
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
      'SMA50',
      'price_earnings_ttm',
      'earnings_per_share_basic_ttm',
      'Recommend.All'
    ]
  });

  console.log(`🔍 Testing 1-click BATCH request for ${tickers.length} Halal EGX stocks...`);
  const start = Date.now();

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
      const elapsed = Date.now() - start;
      try {
        const json = JSON.parse(data);
        console.log(`⚡ Batch fetch finished in ${elapsed} ms! Returned ${json.data?.length || 0} stocks.`);
        for (const row of json.data || []) {
          console.log(`• Ticker: ${row.s} | Price: ${row.d[1]} EGP | Change: ${row.d[2]?.toFixed(2)}%`);
        }
      } catch (err) {
        console.error('Error:', err);
      }
    });
  });

  req.write(postData);
  req.end();
}

testBatchScan();
