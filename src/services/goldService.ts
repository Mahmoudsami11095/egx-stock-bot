import http from 'https';
import { SignalType } from '../types/stock';
import { logger } from './logger';

export interface GoldPrices {
  goldUsdPerOz: number;
  usdToEgp: number;
  gold24kEgp: number;
  gold21kEgp: number;
  gold18kEgp: number;
  goldSovereignEgp: number;
  changePercentUsd: number;
  rsi: number;
  sma20: number;
  sma50: number;
  signalType: SignalType;
  reasons: string[];
  suggested21kEntry: { min: number; max: number };
  suggested21kTarget: number;
  timestamp: Date;
}

export class GoldService {
  async getLiveGoldPrices(): Promise<GoldPrices> {
    const postData = JSON.stringify({
      symbols: {
        tickers: ['TVC:GOLD', 'FX_IDC:USDEGP']
      },
      columns: ['name', 'close', 'change', 'RSI', 'SMA20', 'SMA50', 'high', 'low']
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
            let rsi = 50;
            let sma20 = 0;
            let sma50 = 0;

            for (const row of json.data || []) {
              const ticker = row.s;
              const [name, close, change, rsiVal, sma20Val, sma50Val] = row.d;
              if (ticker.includes('GOLD')) {
                goldUsd = close || 2400;
                changePercentUsd = change || 0;
                rsi = rsiVal ? Number(rsiVal.toFixed(2)) : 50;
                sma20 = sma20Val ? Number(sma20Val.toFixed(2)) : goldUsd;
                sma50 = sma50Val ? Number(sma50Val.toFixed(2)) : goldUsd;
              }
              if (ticker.includes('USDEGP')) {
                usdEgp = close || 51.25;
              }
            }

            const gold24kEgp = (goldUsd * usdEgp) / 31.1035;
            const gold21kEgp = gold24kEgp * (21 / 24);
            const gold18kEgp = gold24kEgp * (18 / 24);
            const goldSovereignEgp = gold21kEgp * 8;

            // Signal evaluation for Gold
            let signalScore = 0;
            const reasons: string[] = [];

            if (rsi < 35) {
              signalScore += 2;
              reasons.push(`🚀 RSI (${rsi}) is in Oversold territory (<35) - Strong rebound / buying opportunity for Gold.`);
            } else if (rsi < 45) {
              signalScore += 1;
              reasons.push(`📈 Gold RSI (${rsi}) is in accumulation zone.`);
            } else if (rsi > 70) {
              signalScore -= 2;
              reasons.push(`⚠️ Gold RSI (${rsi}) is Overbought (>70) - High probability of short-term pullback.`);
            }

            if (sma20 > sma50) {
              signalScore += 1;
              reasons.push(`✨ Bullish Gold Trend: SMA 20 ($${sma20}) is above SMA 50 ($${sma50}).`);
            } else if (sma20 < sma50) {
              signalScore -= 1;
              reasons.push(`🔻 Bearish Gold Trend: SMA 20 ($${sma20}) is below SMA 50 ($${sma50}).`);
            }

            let signalType: SignalType = 'NEUTRAL';
            if (signalScore >= 2) signalType = 'BUY';
            else if (signalScore <= -2) signalType = 'SELL';

            if (reasons.length === 0) {
              reasons.push(`Gold is consolidating around $${goldUsd.toFixed(2)}/oz.`);
            }

            const suggested21kEntry = {
              min: Number((gold21kEgp * 0.985).toFixed(2)),
              max: Number((gold21kEgp * 1.005).toFixed(2)),
            };
            const suggested21kTarget = Number((gold21kEgp * 1.06).toFixed(2));

            resolve({
              goldUsdPerOz: Number(goldUsd.toFixed(2)),
              usdToEgp: Number(usdEgp.toFixed(2)),
              gold24kEgp: Number(gold24kEgp.toFixed(2)),
              gold21kEgp: Number(gold21kEgp.toFixed(2)),
              gold18kEgp: Number(gold18kEgp.toFixed(2)),
              goldSovereignEgp: Number(goldSovereignEgp.toFixed(2)),
              changePercentUsd: Number(changePercentUsd.toFixed(2)),
              rsi,
              sma20,
              sma50,
              signalType,
              reasons,
              suggested21kEntry,
              suggested21kTarget,
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
    const signalBadge = prices.signalType === 'BUY' ? '🚀🟢 [GOLD BUY / توصية شراء الذهب]' : prices.signalType === 'SELL' ? '🔴 [GOLD SELL / تراجع متوقع]' : '🟡 [GOLD HOLD / استقرار]';

    return `
<b>${signalBadge}</b>
<b>⚜️ أسعار وتحليل الذهب المباشر (Gold Signal & Rates)</b>

🌍 <b>الذهب عالمياً (XAU/USD):</b> <code>$${prices.goldUsdPerOz}</code> / أونصة (${changeIcon} ${sign}${prices.changePercentUsd}%)
💵 <b>سعر الدولار مقابل الجنيه:</b> <code>${prices.usdToEgp} EGP</code>
📊 <b>مؤشر القوة النسبية RSI (14):</b> <code>${prices.rsi}</code>

----------------------------------------
<b>🇪🇬 أسعار الذهب في مصر (EGP / جرام):</b>
• 🏆 <b>عيار 24:</b> <code>${prices.gold24kEgp} ج.م</code> / جرام
• 🥇 <b>عيار 21 (الأكثر تداولاً):</b> <code>${prices.gold21kEgp} ج.م</code> / جرام
• 🥈 <b>عيار 18:</b> <code>${prices.gold18kEgp} ج.م</code> / جرام
• 🪙 <b>الجنيه الذهب (8g عيار 21):</b> <code>${prices.goldSovereignEgp} ج.م</code>

<b>💡 أسباب التوصية (Key Signals):</b>
${prices.reasons.map((r) => `• ${r}`).join('\n')}

----------------------------------------
<b>🎯 خطة شراء الذهب المقترحة (عيار 21):</b>
• 📥 <b>نطاق الشراء المناسب:</b> <code>${prices.suggested21kEntry.min} - ${prices.suggested21kEntry.max} EGP</code>
• 🚀 <b>الهدف التقديري:</b> <code>${prices.suggested21kTarget} EGP</code>

⏰ <i>التوقيت: ${prices.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</i>
`.trim();
  }
}
