import https from 'https';

interface GoldPriceData {
  goldUsdPerOz: number;
  usdToEgp: number;
  gold24kEgp: number;
  gold21kEgp: number;
  gold18kEgp: number;
  goldSovereignEgp: number;
  signalType: string;
  rsi: number;
}

function fetchGoldPrices(): Promise<GoldPriceData | null> {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      symbols: { tickers: ['OANDA:XAUUSD'] },
      columns: ['close', 'RSI', 'Recommend.All']
    });

    const options = {
      hostname: 'scanner.tradingview.com',
      port: 443,
      path: '/global/scan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('error', (e) => {
        console.error('Gold API response error:', e);
        resolve(null);
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const row = json.data?.[0];
          if (row?.d) {
            const [goldPrice, rsi, recommend] = row.d;
            const goldUsdPerOz = Number(goldPrice.toFixed(2));
            const usdToEgp = 51.07; // Default, could be fetched separately
            const gold24kEgp = Number((goldUsdPerOz * usdToEgp * 0.03215).toFixed(0));
            const gold21kEgp = Number((gold24kEgp * 0.875).toFixed(0));
            const gold18kEgp = Number((gold24kEgp * 0.75).toFixed(0));
            const goldSovereignEgp = Number((gold21kEgp * 8).toFixed(0));
            const signalType = recommend >= 0.5 ? 'BUY' : recommend <= -0.5 ? 'SELL' : 'NEUTRAL';

            resolve({
              goldUsdPerOz,
              usdToEgp,
              gold24kEgp,
              gold21kEgp,
              gold18kEgp,
              goldSovereignEgp,
              signalType,
              rsi: Number(rsi.toFixed(1)),
            });
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error('Error parsing gold price response:', err);
          resolve(null);
        }
      });
    });

    req.setTimeout(7000, () => {
      console.error('Gold API request timed out (7s)');
      req.destroy();
      resolve(null);
    });

    req.on('error', (e) => {
      console.error('Gold price API request failed:', e.message);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const goldPrices = await fetchGoldPrices();
    if (goldPrices) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
      return res.status(200).json({
        goldUsdPerOz: goldPrices.goldUsdPerOz,
        usdEgpRate: goldPrices.usdToEgp,
        gold24kEgp: goldPrices.gold24kEgp,
        gold21kEgp: goldPrices.gold21kEgp,
        gold18kEgp: goldPrices.gold18kEgp,
        goldCoinEgp: goldPrices.goldSovereignEgp,
        signalType: goldPrices.signalType,
        rsi: goldPrices.rsi
      });
    }
  } catch (err: any) {
    console.error('Error fetching dynamic gold prices:', err);
  }

  // Fallback default data
  return res.status(200).json({
    goldUsdPerOz: 4111.10,
    usdEgpRate: 51.07,
    gold24kEgp: 6828,
    gold21kEgp: 5975,
    gold18kEgp: 5121,
    goldCoinEgp: 47800,
    signalType: 'BUY',
    rsi: 58.4
  });
}