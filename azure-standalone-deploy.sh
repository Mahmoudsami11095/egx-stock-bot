#!/bin/bash
echo "🚀 Starting Standalone Azure VM Deployment for EGX Stock Telegram Bot..."

# Install Node.js & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git
npm install -g pm2

# Create project directory
mkdir -p /root/egx-stock-bot/src/config
mkdir -p /root/egx-stock-bot/src/constants
mkdir -p /root/egx-stock-bot/src/types
mkdir -p /root/egx-stock-bot/src/services
mkdir -p /root/egx-stock-bot/src/bot
mkdir -p /root/egx-stock-bot/src/scheduler
cd /root/egx-stock-bot

# 1. package.json
cat <<'EOF' > package.json
{
  "name": "egx-stock-telegram-bot",
  "version": "1.0.0",
  "description": "Automated Technical Analysis & Buy/Sell Notification Telegram Bot for Egyptian Exchange (EGX) Stocks",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "dotenv": "^16.4.7",
    "node-cron": "^3.0.3",
    "technicalindicators": "^3.1.0",
    "telegraf": "^4.16.3",
    "winston": "^3.17.0",
    "yahoo-finance2": "^2.13.3"
  },
  "devDependencies": {
    "@types/node": "^22.13.0",
    "@types/node-cron": "^3.0.11",
    "ts-node": "^10.9.2",
    "typescript": "^5.7.3"
  }
}
EOF

# 2. tsconfig.json
cat <<'EOF' > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true
  },
  "include": ["src/**/*"]
}
EOF

# 3. .env
cat <<'EOF' > .env
TELEGRAM_BOT_TOKEN=8640417766:AAHCYMvRWnhAvioS5GKwGszt9MULys-obZg
TELEGRAM_CHAT_ID=
POLL_INTERVAL_MINUTES=5
MARKET_HOURS_ONLY=false
CRON_SCHEDULE=*/5 * * * *
NODE_ENV=production
EOF

# 4. src/constants/stocks.ts
cat <<'EOF' > src/constants/stocks.ts
export interface StockMeta {
  symbol: string;
  yahooSymbol: string;
  nameEn: string;
  nameAr: string;
  sector: string;
  defaultSupport?: number;
  defaultResistance?: number;
}

export const INITIAL_STOCKS: StockMeta[] = [
  { symbol: 'ABUK', yahooSymbol: 'ABUK.CA', nameEn: 'Abu Qir Fertilizers', nameAr: 'أبو قير للأساد', sector: 'Fertilizers & Chemicals' },
  { symbol: 'AMOC', yahooSymbol: 'AMOC.CA', nameEn: 'Alexandria Mineral Oils Company', nameAr: 'الإسكندرية للزيوت المعدنية', sector: 'Oil & Gas' },
  { symbol: 'MASR', yahooSymbol: 'MASR.CA', nameEn: 'Madinet Masr for Housing', nameAr: 'مدينة مصر للإسكان والتعمير', sector: 'Real Estate' },
  { symbol: 'MICH', yahooSymbol: 'MICH.CA', nameEn: 'Misr Chemical Industries', nameAr: 'مصر للصناعات الكيماوية', sector: 'Chemicals' },
  { symbol: 'MPCI', yahooSymbol: 'MPCI.CA', nameEn: 'Memphis Pharmaceutical', nameAr: 'ممفيس للأدوية والصناعات الكيماوية', sector: 'Pharmaceuticals' },
  { symbol: 'OLFI', yahooSymbol: 'OLFI.CA', nameEn: 'Obour Land for Food Industries', nameAr: 'عبور لاند للصناعات الغذائية', sector: 'Food & Beverage' },
  { symbol: 'ORAS', yahooSymbol: 'ORAS.CA', nameEn: 'Orascom Construction PLC', nameAr: 'أوراسكوم كونستراكشون', sector: 'Construction' },
  { symbol: 'ORWE', yahooSymbol: 'ORWE.CA', nameEn: 'Oriental Weavers', nameAr: 'النساجون الشرقيون', sector: 'Textiles & Consumer Goods' },
  { symbol: 'SWDY', yahooSymbol: 'SWDY.CA', nameEn: 'Elsewedy Electric', nameAr: 'السويدى إليكتريك', sector: 'Industrial Cables & Energy' },
  { symbol: 'EGAL', yahooSymbol: 'EGAL.CA', nameEn: 'Egypt Aluminium', nameAr: 'مصر للألومنيوم', sector: 'Metals & Mining' },
  { symbol: 'SUGR', yahooSymbol: 'SUGR.CA', nameEn: 'Delta Sugar', nameAr: 'الدلتا للسكر', sector: 'Food & Agriculture' },
  { symbol: 'SKPC', yahooSymbol: 'SKPC.CA', nameEn: 'Sidi Kerir Petrochemicals', nameAr: 'سيدى كرير للبتروكيماويات', sector: 'Petrochemicals' },
];
EOF

# 5. src/types/stock.ts
cat <<'EOF' > src/types/stock.ts
export interface Candle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockQuote {
  symbol: string;
  yahooSymbol: string;
  nameEn: string;
  nameAr: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  avgVolume: number;
  peRatio?: number;
  marketCap?: number;
}

export type SignalType = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

export interface TechnicalIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  macd?: {
    MACD?: number;
    signal?: number;
    histogram?: number;
  };
  support: number;
  resistance: number;
  volumeSpike: boolean;
  volumeRatio: number;
}

export interface StockAnalysisResult {
  quote: StockQuote;
  indicators: TechnicalIndicators;
  signalType: SignalType;
  reasons: string[];
  fairValue: number;
  fairValueUpsidePercent: number;
  suggestedEntry: { min: number; max: number };
  suggestedTarget: { target1: number; target2: number };
  suggestedStopLoss: number;
  timestamp: Date;
}

export interface AlertState {
  lastSignalType: SignalType;
  lastAlertTime: number;
  lastPrice: number;
}
EOF

# 6. src/config/environment.ts
cat <<'EOF' > src/config/environment.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  pollIntervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES || '5', 10),
  marketHoursOnly: process.env.MARKET_HOURS_ONLY === 'true',
  cronSchedule: process.env.CRON_SCHEDULE || '*/5 * * * *',
  nodeEnv: process.env.NODE_ENV || 'production',
};
EOF

# 7. src/services/logger.ts
cat <<'EOF' > src/services/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
EOF

# 8. src/services/dataFetcher.ts
cat <<'EOF' > src/services/dataFetcher.ts
import http from 'https';
import { StockQuote, Candle, TechnicalIndicators } from '../types/stock';
import { StockMeta } from '../constants/stocks';
import { logger } from './logger';

export class DataFetcherService {
  async getQuoteAndIndicators(stock: StockMeta): Promise<{ quote: StockQuote; indicators: TechnicalIndicators; automatedFairValue: number }> {
    const symbol = stock.symbol.toUpperCase();
    const tvSymbol = `EGX:${symbol}`;

    const postData = JSON.stringify({
      symbols: { tickers: [tvSymbol] },
      columns: [
        'name', 'close', 'change', 'volume', 'average_volume_30d_calc',
        'high', 'low', 'price_52_week_high', 'price_52_week_low',
        'RSI', 'SMA20', 'SMA50', 'price_earnings_ttm', 'earnings_per_share_basic_ttm', 'Recommend.All'
      ]
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'scanner.tradingview.com',
        port: 443,
        path: '/egypt/scan',
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
            const row = json.data?.[0];

            if (!row || !row.d) {
              return reject(new Error(`No TradingView data returned for ${tvSymbol}`));
            }

            const [
              name, closePrice, changePercent, volume, avgVolume,
              dayHigh, dayLow, fiftyTwoWeekHigh, fiftyTwoWeekLow,
              rsi, sma20, sma50, peRatio, eps, recommendScore
            ] = row.d;

            const currentPrice = Number(closePrice.toFixed(2));
            const change = (currentPrice * (changePercent || 0)) / 100;
            const previousClose = currentPrice - change;

            const quote: StockQuote = {
              symbol: stock.symbol,
              yahooSymbol: `${stock.symbol}.CA`,
              nameEn: stock.nameEn,
              nameAr: stock.nameAr,
              currentPrice,
              previousClose: Number(previousClose.toFixed(2)),
              change: Number(change.toFixed(2)),
              changePercent: Number((changePercent || 0).toFixed(2)),
              dayHigh: Number((dayHigh || currentPrice).toFixed(2)),
              dayLow: Number((dayLow || currentPrice).toFixed(2)),
              fiftyTwoWeekHigh: Number((fiftyTwoWeekHigh || currentPrice).toFixed(2)),
              fiftyTwoWeekLow: Number((fiftyTwoWeekLow || currentPrice).toFixed(2)),
              volume: volume || 0,
              avgVolume: Math.round(avgVolume || 0),
              peRatio: peRatio ? Number(peRatio.toFixed(2)) : undefined,
            };

            const support = stock.defaultSupport || Number((dayLow ? Math.min(dayLow, currentPrice * 0.96) : currentPrice * 0.95).toFixed(2));
            const resistance = stock.defaultResistance || Number((dayHigh ? Math.max(dayHigh, currentPrice * 1.04) : currentPrice * 1.05).toFixed(2));
            const volRatio = avgVolume && avgVolume > 0 ? Number((volume / avgVolume).toFixed(2)) : 1;

            const indicators: TechnicalIndicators = {
              rsi: rsi ? Number(rsi.toFixed(2)) : 50,
              sma20: sma20 ? Number(sma20.toFixed(2)) : currentPrice,
              sma50: sma50 ? Number(sma50.toFixed(2)) : currentPrice,
              support,
              resistance,
              volumeSpike: volRatio >= 1.3,
              volumeRatio: volRatio,
            };

            let automatedFairValue = currentPrice;
            if (eps && eps > 0) {
              const peValuation = eps * 13.5;
              const momentumMultiplier = 1 + ((recommendScore || 0) * 0.08);
              automatedFairValue = peValuation * momentumMultiplier;
            } else {
              const low52 = fiftyTwoWeekLow || currentPrice * 0.7;
              const high52 = fiftyTwoWeekHigh || currentPrice * 1.3;
              const rangeMidpoint = low52 + 0.618 * (high52 - low52);
              const scoreFactor = 1 + (recommendScore || 0) * 0.1;
              automatedFairValue = Math.max(rangeMidpoint, currentPrice * scoreFactor);
            }

            automatedFairValue = Math.max(currentPrice * 0.85, Math.min(currentPrice * 1.5, automatedFairValue));
            automatedFairValue = Number(automatedFairValue.toFixed(2));

            resolve({ quote, indicators, automatedFairValue });
          } catch (err) {
            logger.error(`Error parsing TradingView response for ${symbol}: ${err}`);
            reject(err);
          }
        });
      });

      req.on('error', (e) => {
        logger.error(`TradingView API request failed for ${symbol}: ${e.message}`);
        reject(e);
      });

      req.write(postData);
      req.end();
    });
  }

  async getQuote(stock: StockMeta): Promise<StockQuote> {
    const { quote } = await this.getQuoteAndIndicators(stock);
    return quote;
  }

  async getHistoricalCandles(stock: StockMeta, days: number = 90): Promise<Candle[]> {
    return [];
  }
}
EOF

# 9. src/services/signalDetector.ts
cat <<'EOF' > src/services/signalDetector.ts
import { StockQuote, StockAnalysisResult, SignalType, TechnicalIndicators } from '../types/stock';
import { StockMeta } from '../constants/stocks';

export class SignalDetectorService {
  analyzeStockWithIndicators(stock: StockMeta, quote: StockQuote, indicators: TechnicalIndicators, automatedFairValue: number): StockAnalysisResult {
    const price = quote.currentPrice;
    const reasons: string[] = [];
    let signalScore = 0;

    const fairValue = automatedFairValue;
    const fairValueUpsidePercent = Number((((fairValue - price) / price) * 100).toFixed(2));

    if (fairValueUpsidePercent >= 10) {
      signalScore += 2;
      reasons.push(`💎 UNDERVALUED (فرصة نمو): Current price is ${fairValueUpsidePercent}% below automated Fair Value (${fairValue} EGP).`);
    } else if (fairValueUpsidePercent <= -8) {
      signalScore -= 1;
      reasons.push(`⚠️ OVERVALUED (أعلى من القيمة العادلة): Current price exceeds automated Fair Value (${fairValue} EGP) by ${Math.abs(fairValueUpsidePercent)}%.`);
    }

    if (indicators.rsi < 35) {
      signalScore += 2;
      reasons.push(`🚀 RSI (${indicators.rsi}) is in Oversold territory (<35) - Rebound opportunity.`);
    } else if (indicators.rsi < 45) {
      signalScore += 1;
      reasons.push(`📈 RSI (${indicators.rsi}) is in bullish accumulation zone.`);
    } else if (indicators.rsi > 70) {
      signalScore -= 2;
      reasons.push(`⚠️ RSI (${indicators.rsi}) is in Overbought zone (>70) - Caution near peaks.`);
    }

    if (indicators.sma20 > indicators.sma50) {
      signalScore += 1;
      reasons.push(`✨ Bullish Trend: SMA 20 (${indicators.sma20}) is above SMA 50 (${indicators.sma50}).`);
    } else if (indicators.sma20 < indicators.sma50) {
      signalScore -= 1;
      reasons.push(`🔻 Bearish Trend: SMA 20 (${indicators.sma20}) is below SMA 50 (${indicators.sma50}).`);
    }

    const distToResistance = ((indicators.resistance - price) / price) * 100;
    const distToSupport = ((price - indicators.support) / price) * 100;

    if (price >= indicators.resistance) {
      if (indicators.volumeSpike) {
        signalScore += 3;
        reasons.push(`🔥 BREAKOUT CONFIRMED: Price broke Resistance at ${indicators.resistance} EGP with Volume ${indicators.volumeRatio}x average!`);
      } else {
        signalScore -= 1;
        reasons.push(`⚠️ Price is testing Resistance at ${indicators.resistance} EGP.`);
      }
    } else if (distToResistance <= 2) {
      signalScore -= 1;
      reasons.push(`📍 Price is close to Resistance (${indicators.resistance} EGP).`);
    }

    if (distToSupport <= 3 && price >= indicators.support) {
      signalScore += 2;
      reasons.push(`🎯 Price is touching key Support level (${indicators.support} EGP) - Good entry risk/reward.`);
    } else if (price < indicators.support) {
      signalScore -= 3;
      reasons.push(`🚨 STOP LOSS ALERT: Price broke below Support (${indicators.support} EGP).`);
    }

    let signalType: SignalType = 'NEUTRAL';
    if (signalScore >= 3) signalType = 'STRONG_BUY';
    else if (signalScore >= 1) signalType = 'BUY';
    else if (signalScore <= -3) signalType = 'STRONG_SELL';
    else if (signalScore <= -1) signalType = 'SELL';

    if (reasons.length === 0) reasons.push(`Price is consolidating stably around ${price} EGP.`);

    const suggestedEntry = { min: Number((indicators.support * 1.005).toFixed(2)), max: Number((indicators.support * 1.03).toFixed(2)) };
    const suggestedTarget = { target1: Number((indicators.resistance * 0.99).toFixed(2)), target2: Number((Math.max(indicators.resistance * 1.05, fairValue)).toFixed(2)) };
    const suggestedStopLoss = Number((indicators.support * 0.96).toFixed(2));

    return { quote, indicators, signalType, reasons, fairValue, fairValueUpsidePercent, suggestedEntry, suggestedTarget, suggestedStopLoss, timestamp: new Date() };
  }

  analyzeStock(stock: StockMeta, quote: StockQuote, candles: any[]): StockAnalysisResult {
    const indicators: TechnicalIndicators = { rsi: 50, sma20: quote.currentPrice, sma50: quote.currentPrice, support: stock.defaultSupport || quote.currentPrice * 0.95, resistance: stock.defaultResistance || quote.currentPrice * 1.05, volumeSpike: false, volumeRatio: 1 };
    return this.analyzeStockWithIndicators(stock, quote, indicators, quote.currentPrice * 1.1);
  }
}
EOF

# 10. src/services/stateManager.ts
cat <<'EOF' > src/services/stateManager.ts
import fs from 'fs';
import path from 'path';
import { StockMeta, INITIAL_STOCKS } from '../constants/stocks';
import { AlertState, SignalType } from '../types/stock';
import { logger } from './logger';

export class StateManager {
  private watchlistFile: string;
  private watchlist: StockMeta[] = [];
  private alertStates: Map<string, AlertState> = new Map();
  private cooldownMs = 2 * 60 * 60 * 1000;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    this.watchlistFile = path.join(dataDir, 'watchlist.json');
    this.loadWatchlist();
  }

  private loadWatchlist(): void {
    if (fs.existsSync(this.watchlistFile)) {
      try {
        const raw = fs.readFileSync(this.watchlistFile, 'utf-8');
        this.watchlist = JSON.parse(raw);
        logger.info(`Loaded ${this.watchlist.length} stocks from watchlist.json`);
        return;
      } catch (err) { logger.error(`Error reading watchlist.json, loading defaults: ${err}`); }
    }
    this.watchlist = [...INITIAL_STOCKS];
    this.saveWatchlist();
  }

  public saveWatchlist(): void {
    try { fs.writeFileSync(this.watchlistFile, JSON.stringify(this.watchlist, null, 2), 'utf-8'); }
    catch (err) { logger.error(`Failed to save watchlist.json: ${err}`); }
  }

  public getWatchlist(): StockMeta[] { return this.watchlist; }

  public addStock(stock: StockMeta): boolean {
    const exists = this.watchlist.some((s) => s.symbol.toUpperCase() === stock.symbol.toUpperCase());
    if (exists) return false;
    this.watchlist.push(stock);
    this.saveWatchlist();
    return true;
  }

  public removeStock(symbol: string): boolean {
    const initialLen = this.watchlist.length;
    this.watchlist = this.watchlist.filter((s) => s.symbol.toUpperCase() !== symbol.toUpperCase());
    if (this.watchlist.length !== initialLen) { this.saveWatchlist(); return true; }
    return false;
  }

  public findStock(symbol: string): StockMeta | undefined {
    return this.watchlist.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
  }

  public shouldSendAlert(symbol: string, currentSignal: SignalType, currentPrice: number): boolean {
    if (currentSignal === 'NEUTRAL') return false;
    const state = this.alertStates.get(symbol);
    const now = Date.now();
    if (!state) {
      this.alertStates.set(symbol, { lastSignalType: currentSignal, lastAlertTime: now, lastPrice: currentPrice });
      return true;
    }
    if (state.lastSignalType !== currentSignal) {
      this.alertStates.set(symbol, { lastSignalType: currentSignal, lastAlertTime: now, lastPrice: currentPrice });
      return true;
    }
    if (now - state.lastAlertTime > this.cooldownMs) {
      this.alertStates.set(symbol, { lastSignalType: currentSignal, lastAlertTime: now, lastPrice: currentPrice });
      return true;
    }
    return false;
  }
}
EOF

# 11. src/bot/templates.ts
cat <<'EOF' > src/bot/templates.ts
import { StockAnalysisResult, SignalType } from '../types/stock';

export function getSignalEmoji(signal: SignalType): string {
  switch (signal) {
    case 'STRONG_BUY': return '🚀🟢 [STRONG BUY / شراء قوي]';
    case 'BUY': return '🟢 [BUY / شراء]';
    case 'SELL': return '🔴 [SELL / بيع]';
    case 'STRONG_SELL': return '🚨🔴 [STRONG SELL / بيع قوي - وقف خسارة]';
    default: return '🟡 [NEUTRAL / محايد]';
  }
}

export function formatSignalCard(analysis: StockAnalysisResult): string {
  const { quote, indicators, signalType, reasons, fairValue, fairValueUpsidePercent, suggestedEntry, suggestedTarget, suggestedStopLoss } = analysis;
  const emojiHeader = getSignalEmoji(signalType);
  const changeIcon = quote.change >= 0 ? '📈' : '📉';
  const sign = quote.change >= 0 ? '+' : '';
  const upsideSign = fairValueUpsidePercent >= 0 ? '+' : '';
  const upsideBadge = fairValueUpsidePercent >= 0 ? '💚 فرصة نمو' : '⚠️ أعلى من القيمة العادلة';

  return `
<b>${emojiHeader}</b>
<b>السهم: ${quote.nameAr} (${quote.symbol})</b>
<i>${quote.nameEn}</i>

💵 <b>السعر الحالي:</b> <code>${quote.currentPrice} EGP</code> (${changeIcon} ${sign}${quote.changePercent}%)
💎 <b>القيمة العادلة (Fair Value):</b> <code>${fairValue} EGP</code> (فارق <b>${upsideSign}${fairValueUpsidePercent}%</b> ${upsideBadge})
📊 <b>حجم التداول اليومي:</b> <code>${quote.volume.toLocaleString()}</code> (مقارنة بـ ${indicators.volumeRatio}x المتوسط)
----------------------------------------
<b>📐 المؤشرات الفنية (Technical Indicators):</b>
• <b>RSI (14):</b> <code>${indicators.rsi}</code> ${indicators.rsi < 35 ? '🔥 (قاع/تشبع بيعي)' : indicators.rsi > 70 ? '⚠️ (تضخم)' : ''}
• <b>المتوسط المتحرك 20:</b> <code>${indicators.sma20} EGP</code>
• <b>المتوسط المتحرك 50:</b> <code>${indicators.sma50} EGP</code>
• <b>مستوى الدعم (Support):</b> <code>${indicators.support} EGP</code>
• <b>مستوى المقاومة (Resistance):</b> <code>${indicators.resistance} EGP</code>

<b>💡 أسباب التوصية (Key Signals):</b>
${reasons.map((r) => `• ${r}`).join('\n')}

----------------------------------------
<b>🎯 خطة التداول المقترحة (Trading Plan):</b>
• 📥 <b>نطاق الدخول الآمن:</b> <code>${suggestedEntry.min} - ${suggestedEntry.max} EGP</code>
• 🎯 <b>الهدف الأول (Target 1):</b> <code>${suggestedTarget.target1} EGP</code>
• 🚀 <b>الهدف الثاني (القيمة العادلة Target 2):</b> <code>${suggestedTarget.target2} EGP</code>
• 🛑 <b>وقف الخسارة (Stop Loss):</b> <code>${suggestedStopLoss} EGP</code>

⏰ <i>التوقيت: ${analysis.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</i>
`.trim();
}

export function formatWatchlistStatus(analyses: StockAnalysisResult[]): string {
  let text = `<b>📊 ملخص أسهم البورصة المصرية والقيمة العادلة (EGX Watchlist & Fair Values)</b>\n\n`;
  for (const a of analyses) {
    const icon = a.quote.change >= 0 ? '🟢' : '🔴';
    const sign = a.quote.change >= 0 ? '+' : '';
    const signalBadge = getSignalEmoji(a.signalType);
    const upsideSign = a.fairValueUpsidePercent >= 0 ? '+' : '';

    text += `<b>${icon} ${a.quote.symbol} - ${a.quote.nameAr}</b>\n`;
    text += `السعر اللحظي: <code>${a.quote.currentPrice} ج.م</code> (${sign}${a.quote.changePercent}%)\n`;
    text += `💎 <b>القيمة العادلة:</b> <code>${a.fairValue} ج.م</code> (فارق <b>${upsideSign}${a.fairValueUpsidePercent}%</b>)\n`;
    text += `الإشارة: ${signalBadge}\n`;
    text += `الدعم: <code>${a.indicators.support}</code> | المقاومة: <code>${a.indicators.resistance}</code>\n\n`;
  }
  text += `<i>💡 استخدم الأمر <code>/signals TICKER</code> (مثل <code>/signals MPCI</code>) للحصول على تقرير فني تفصيلي والقيمة العادلة.</i>`;
  return text;
}
EOF

# 12. src/bot/commands.ts
cat <<'EOF' > src/bot/commands.ts
import { Telegraf, Context } from 'telegraf';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { StateManager } from '../services/stateManager';
import { formatSignalCard, formatWatchlistStatus } from './templates';
import { logger } from '../services/logger';

export function setupCommands(
  bot: Telegraf,
  stateManager: StateManager,
  dataFetcher: DataFetcherService,
  signalDetector: SignalDetectorService
) {
  bot.command(['start', 'help'], (ctx: Context) => {
    const helpMsg = `
<b>🤖 أهلاً بك في بوت توصيات ومؤشرات البورصة المصرية (EGX Stock Signals Bot)</b>

هذا البوت يراقب حركة أسهم البورصة المصرية لحظياً من منصة TradingView، ويقوم بحساب <b>القيمة العادلة تلقائياً (Automated Fair Value)</b>، وتحليل المؤشرات الفنية وإرسال التوصيات تلقائياً.

<b>📋 الأوامر المتاحة (Commands):</b>
• <code>/status</code> - ملخص سريع لحالة جميع الأسهم المتابعة والتغير اليومي والأسعار والقيمة العادلة.
• <code>/signals TICKER</code> - تحليل فني شامل وتفصيلي لسهم معين (مثال: <code>/signals MPCI</code>).
• <code>/add TICKER</code> - إضافة سهم جديد لقائمة المتابعة (مثال: <code>/add COMI</code>).
• <code>/remove TICKER</code> - حذف سهم من قائمة المتابعة.

<b>📊 الأسهم المتابعة حالياً:</b>
<code>${stateManager.getWatchlist().map((s) => s.symbol).join(', ')}</code>
`;
    ctx.replyWithHTML(helpMsg);
  });

  bot.command('status', async (ctx: Context) => {
    ctx.reply('🔍 جاري فحص الأسعار اللحظية وحساب القيمة العادلة التلقائية لأسهم البورصة المصرية...');
    try {
      const watchlist = stateManager.getWatchlist();
      const analyses = [];
      for (const stock of watchlist) {
        try {
          const { quote, indicators, automatedFairValue } = await dataFetcher.getQuoteAndIndicators(stock);
          const analysis = signalDetector.analyzeStockWithIndicators(stock, quote, indicators, automatedFairValue);
          analyses.push(analysis);
        } catch (err) { logger.error(`Error analyzing ${stock.symbol} for status: ${err}`); }
      }
      if (analyses.length === 0) return ctx.reply('⚠️ تعذر جلب بيانات الأسهم حالياً.');
      ctx.replyWithHTML(formatWatchlistStatus(analyses));
    } catch (error) { logger.error(`Error handling /status: ${error}`); ctx.reply('❌ حدث خطأ أثناء تنفيذ الأمر.'); }
  });

  bot.command('signals', async (ctx: Context) => {
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.trim().split(/\s+/);
    const symbol = parts[1]?.toUpperCase();
    if (!symbol) return ctx.reply('⚠️ يرجى تحديد رمز السهم. مثال: `/signals MPCI`', { parse_mode: 'Markdown' });

    const stock = stateManager.findStock(symbol) || { symbol, yahooSymbol: `${symbol}.CA`, nameEn: symbol, nameAr: symbol, sector: 'General' };
    ctx.reply(`📊 جاري حساب القيمة العادلة وإجراء التحليل الفني لسهم ${stock.nameAr} (${symbol})...`);

    try {
      const { quote, indicators, automatedFairValue } = await dataFetcher.getQuoteAndIndicators(stock);
      const analysis = signalDetector.analyzeStockWithIndicators(stock, quote, indicators, automatedFairValue);
      ctx.replyWithHTML(formatSignalCard(analysis));
    } catch (err) { logger.error(`Error in /signals for ${symbol}: ${err}`); ctx.reply(`❌ تعذر جلب التحليل لسهم ${symbol}.`); }
  });

  bot.command('add', (ctx: Context) => {
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.trim().split(/\s+/);
    const symbol = parts[1]?.toUpperCase();
    if (!symbol) return ctx.reply('⚠️ اكتب رمز السهم. مثال: `/add COMI`', { parse_mode: 'Markdown' });

    const added = stateManager.addStock({ symbol, yahooSymbol: `${symbol}.CA`, nameEn: symbol, nameAr: symbol, sector: 'Custom' });
    if (added) ctx.reply(`✅ تم إضافة السهم <b>${symbol}</b> بنجاح إلى قائمة المتابعة!`, { parse_mode: 'HTML' });
    else ctx.reply(`ℹ️ السهم <b>${symbol}</b> موجود بالفعل في القائمة.`, { parse_mode: 'HTML' });
  });

  bot.command('remove', (ctx: Context) => {
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.trim().split(/\s+/);
    const symbol = parts[1]?.toUpperCase();
    if (!symbol) return ctx.reply('⚠️ اكتب رمز السهم. مثال: `/remove MPCI`', { parse_mode: 'Markdown' });

    const removed = stateManager.removeStock(symbol);
    if (removed) ctx.reply(`🗑️ تم حذف السهم <b>${symbol}</b> من القائمة.`, { parse_mode: 'HTML' });
    else ctx.reply(`⚠️ لم يتم العثور على السهم <b>${symbol}</b> في القائمة.`, { parse_mode: 'HTML' });
  });
}
EOF

# 13. src/bot/telegramBot.ts
cat <<'EOF' > src/bot/telegramBot.ts
import { Telegraf } from 'telegraf';
import { config } from '../config/environment';
import { StateManager } from '../services/stateManager';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { setupCommands } from './commands';
import { StockAnalysisResult } from '../types/stock';
import { formatSignalCard } from './templates';
import { logger } from '../services/logger';

export class TelegramBotService {
  public bot: Telegraf | null = null;

  constructor(
    private stateManager: StateManager,
    private dataFetcher: DataFetcherService,
    private signalDetector: SignalDetectorService
  ) {
    if (config.telegramBotToken) {
      this.bot = new Telegraf(config.telegramBotToken);
      setupCommands(this.bot, this.stateManager, this.dataFetcher, this.signalDetector);
    }
  }

  public async start(): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.launch();
      logger.info('🤖 Telegram Bot launched successfully!');
    } catch (error) { logger.error(`Failed to launch Telegram Bot: ${error}`); }
  }

  public async sendNotificationCard(analysis: StockAnalysisResult, chatId?: string): Promise<boolean> {
    const targetChatId = chatId || config.telegramChatId;
    if (!this.bot || !targetChatId) return false;
    try {
      await this.bot.telegram.sendMessage(targetChatId, formatSignalCard(analysis), { parse_mode: 'HTML' });
      return true;
    } catch (error) { logger.error(`Failed to send alert for ${analysis.quote.symbol}: ${error}`); return false; }
  }

  public stop(reason: string): void { if (this.bot) this.bot.stop(reason); }
}
EOF

# 14. src/scheduler/cronScheduler.ts
cat <<'EOF' > src/scheduler/cronScheduler.ts
import cron from 'node-cron';
import { config } from '../config/environment';
import { StateManager } from '../services/stateManager';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { TelegramBotService } from '../bot/telegramBot';
import { logger } from '../services/logger';

export class CronSchedulerService {
  constructor(
    private stateManager: StateManager,
    private dataFetcher: DataFetcherService,
    private signalDetector: SignalDetectorService,
    private telegramBot: TelegramBotService
  ) {}

  public startSchedule(): void {
    const cronExpr = config.cronSchedule;
    logger.info(`⏰ Starting Automated Market Monitor Cron Schedule (${cronExpr})`);
    cron.schedule(cronExpr, async () => { await this.runMarketScan(); });
    setImmediate(async () => { await this.runMarketScan(); });
  }

  public async runMarketScan(): Promise<void> {
    logger.info('🔍 Starting automated market scan via TradingView...');
    const watchlist = this.stateManager.getWatchlist();

    for (const stock of watchlist) {
      try {
        const { quote, indicators, automatedFairValue } = await this.dataFetcher.getQuoteAndIndicators(stock);
        const analysis = this.signalDetector.analyzeStockWithIndicators(stock, quote, indicators, automatedFairValue);
        logger.info(`[Scan] ${stock.symbol}: ${quote.currentPrice} EGP | Fair Value: ${automatedFairValue} EGP | Signal: ${analysis.signalType}`);

        if (this.stateManager.shouldSendAlert(stock.symbol, analysis.signalType, quote.currentPrice)) {
          logger.info(`🚨 New signal for ${stock.symbol}! Sending Telegram alert...`);
          await this.telegramBot.sendNotificationCard(analysis);
        }
      } catch (error) { logger.error(`Error scanning ${stock.symbol}: ${error}`); }
    }
    logger.info('✅ Market scan completed.');
  }
}
EOF

# 15. src/index.ts
cat <<'EOF' > src/index.ts
import { StateManager } from './services/stateManager';
import { DataFetcherService } from './services/dataFetcher';
import { SignalDetectorService } from './services/signalDetector';
import { TelegramBotService } from './bot/telegramBot';
import { CronSchedulerService } from './scheduler/cronScheduler';
import { logger } from './services/logger';

async function bootstrap() {
  logger.info('=====================================================');
  logger.info('🚀 Launching EGX Stock Signal Telegram Bot System');
  logger.info('=====================================================');

  const stateManager = new StateManager();
  const dataFetcher = new DataFetcherService();
  const signalDetector = new SignalDetectorService();
  const telegramBot = new TelegramBotService(stateManager, dataFetcher, signalDetector);
  const cronScheduler = new CronSchedulerService(stateManager, dataFetcher, signalDetector, telegramBot);

  await telegramBot.start();
  cronScheduler.startSchedule();

  process.once('SIGINT', () => { telegramBot.stop('SIGINT'); process.exit(0); });
  process.once('SIGTERM', () => { telegramBot.stop('SIGTERM'); process.exit(0); });
}

bootstrap().catch((error) => logger.error(`Fatal startup failure: ${error}`));
EOF

# Install & Build TypeScript project
echo "📦 Installing packages..."
npm install

echo "🔨 Building TypeScript..."
npx tsc

# Start PM2
echo "⚡ Starting PM2 process..."
pm2 stop egx-stock-bot || true
pm2 delete egx-stock-bot || true
pm2 start dist/index.js --name "egx-stock-bot"
pm2 save

echo "========================================================="
echo "✅ DEPLOYMENT COMPLETE! Your Stock Bot is running 24/7!"
echo "========================================================="
