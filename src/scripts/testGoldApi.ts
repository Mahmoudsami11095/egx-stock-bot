import http from 'https';

function testGoldAndForex() {
  const postData = JSON.stringify({
    symbols: {
      tickers: [
        'TVC:GOLD',
        'FX_IDC:USDEGP'
      ]
    },
    columns: [
      'name',
      'close',
      'change',
      'high',
      'low'
    ]
  });

  const options = {
    hostname: 'scanner.tradingview.com',
    port: 443,
    path: '/global/scan',
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
        console.log('✅ TradingView Gold & Forex Scanner Output:\n');

        let goldUsd = 0;
        let usdEgp = 48.5;

        for (const row of json.data || []) {
          const ticker = row.s;
          const [name, close, change] = row.d;
          console.log(`Ticker: ${ticker} | Close: ${close} | Change: ${change}%`);
          if (ticker.includes('GOLD')) goldUsd = close;
          if (ticker.includes('USDEGP')) usdEgp = close;
        }

        if (goldUsd > 0 && usdEgp > 0) {
          const gold24k = (goldUsd * usdEgp) / 31.1035;
          const gold21k = gold24k * (21 / 24);
          const gold18k = gold24k * (18 / 24);
          const goldPound = gold21k * 8;

          console.log('\n🇪🇬 Calculated Egyptian Gold Prices (EGP):');
          console.log(`• 🏆 24K Gold: ${gold24k.toFixed(2)} EGP / gram`);
          console.log(`• 🥇 21K Gold: ${gold21k.toFixed(2)} EGP / gram`);
          console.log(`• 🥈 18K Gold: ${gold18k.toFixed(2)} EGP / gram`);
          console.log(`• 🪙 Gold Sovereign (الجنيه الذهب): ${goldPound.toFixed(2)} EGP`);
        }
      } catch (err) {
        console.error('Error:', err);
      }
    });
  });

  req.write(postData);
  req.end();
}

testGoldAndForex();
