import http from 'https';
import { logger } from './logger';

export interface GoldPrices {
  goldUsdPerOz: number;
  usdToEgp: number;
  gold24kEgp: number;
  gold21kEgp: number;
  gold18kEgp: number;
  goldSovereignEgp: number; // الجنيه الذهب
  changePercentUsd: number;
  timestamp: Date;
}

export class GoldService {
  async getLiveGoldPrices(): Promise<GoldPrices> {
    const postData = JSON.stringify({
      symbols: {
        tickers: ['TVC:GOLD', 'FX_IDC:USDEGP']
      },
      columns: ['name', 'close', 'change']
    });

    return new Promise((resolve, reject) => {
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

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            let goldUsd = 0;
            let usdEgp = 51.25;
            let changePercentUsd = 0;

            for (const row of json.data || []) {
              const ticker = row.s;
              const [name, close, change] = row.d;
              if (ticker.includes('GOLD')) {
                goldUsd = close;
                changePercentUsd = change || 0;
              }
              if (ticker.includes('USDEGP')) {
                usdEgp = close || 51.25;
              }
            }

            if (goldUsd === 0) {
              goldUsd = 2400; // fallback safety
            }

            const gold24kEgp = (goldUsd * usdEgp) / 31.1035;
            const gold21kEgp = gold24kEgp * (21 / 24);
            const gold18kEgp = gold24kEgp * (18 / 24);
            const goldSovereignEgp = gold21kEgp * 8;

            resolve({
              goldUsdPerOz: Number(goldUsd.toFixed(2)),
              usdToEgp: Number(usdEgp.toFixed(2)),
              gold24kEgp: Number(gold24kEgp.toFixed(2)),
              gold21kEgp: Number(gold21kEgp.toFixed(2)),
              gold18kEgp: Number(gold18kEgp.toFixed(2)),
              goldSovereignEgp: Number(goldSovereignEgp.toFixed(2)),
              changePercentUsd: Number(changePercentUsd.toFixed(2)),
              timestamp: new Date()
            });
          } catch (err) {
            logger.error(`Error parsing Gold prices: ${err}`);
            reject(err);
          }
        });
      });

      req.on('error', (e) => {
        logger.error(`Gold API request failed: ${e.message}`);
        reject(e);
      });

      req.write(postData);
      req.end();
    });
  }

  formatGoldMessage(prices: GoldPrices): string {
    const changeIcon = prices.changePercentUsd >= 0 ? '📈' : '📉';
    const sign = prices.changePercentUsd >= 0 ? '+' : '';

    return `
<b>⚜️ أسعار الذهب المباشرة اليوم (Live Gold Prices)</b>

🌍 <b>الذهب عالمياً (XAU/USD):</b> <code>$${prices.goldUsdPerOz}</code> / أونصة (${changeIcon} ${sign}${prices.changePercentUsd}%)
💵 <b>سعر الدولار مقابل الجنيه (USD/EGP):</b> <code>${prices.usdToEgp} EGP</code>

----------------------------------------
<b>🇪🇬 أسعار الذهب في مصر (EGP / جرام):</b>
• 🏆 <b>عيار 24:</b> <code>${prices.gold24kEgp} ج.م</code> / جرام
• 🥇 <b>عيار 21 (الأكثر تداولاً):</b> <code>${prices.gold21kEgp} ج.م</code> / جرام
• 🥈 <b>عيار 18:</b> <code>${prices.gold18kEgp} ج.م</code> / جرام
• 🪙 <b>الجنيه الذهب (8g عيار 21):</b> <code>${prices.goldSovereignEgp} ج.م</code>

⏰ <i>التوقيت: ${prices.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</i>
`.trim();
  }
}
