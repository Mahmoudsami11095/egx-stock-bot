import { EventEmitter } from 'events';
import https from 'https';
import { StockMeta } from '../constants/stocks';
import { StockQuote, TechnicalIndicators, WsPriceUpdate } from '../types/stock';
import { logger } from './logger';

export interface EgxLiveScraperQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  timestamp: number;
}

/**
 * EgxLiveScraperService: Low-latency live market price scraper & broadcast engine.
 * Emits real-time price tick events to WebSocket subscribers.
 * Incorporates cache-busting dynamic headers and randomized request seeds
 * to prevent CDN price delay.
 */
export class EgxLiveScraperService extends EventEmitter {
  private cache: Map<string, EgxLiveScraperQuote> = new Map();
  private pollingTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private pollingIntervalMs: number = 4000; // 4 seconds intraday high frequency

  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
  ];

  constructor() {
    super();
  }

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Start live background polling for real-time price updates.
   */
  public start(stocks: StockMeta[]): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`⚡ [EgxLiveScraperService] Started real-time live scraper engine (${this.pollingIntervalMs}ms interval)`);

    this.pollLivePrices(stocks);
    this.pollingTimer = setInterval(() => {
      this.pollLivePrices(stocks);
    }, this.pollingIntervalMs);
  }

  public stop(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isRunning = false;
    logger.info(`⏹️ [EgxLiveScraperService] Live scraper engine stopped.`);
  }

  public getCachedQuote(symbol: string): EgxLiveScraperQuote | undefined {
    return this.cache.get(symbol.toUpperCase());
  }

  public getAllCachedQuotes(): EgxLiveScraperQuote[] {
    return Array.from(this.cache.values());
  }

  /**
   * High-frequency live scanner request with dynamic cache-busting headers.
   */
  private pollLivePrices(stocks: StockMeta[]): void {
    if (!stocks || stocks.length === 0) return;

    const tvTickers = stocks.map(s => `EGX:${s.symbol.toUpperCase()}`);
    const timestampSeed = Date.now();
    const requestId = `req_${Math.random().toString(36).substring(2, 9)}_${timestampSeed}`;

    const postData = JSON.stringify({
      symbols: { tickers: tvTickers },
      columns: ['name', 'close', 'change', 'volume', 'high', 'low']
    });

    const options: https.RequestOptions = {
      hostname: 'scanner.tradingview.com',
      port: 443,
      path: `/egypt/scan?_ts=${timestampSeed}&_rid=${requestId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': this.getRandomUserAgent(),
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Request-ID': requestId,
        'X-Client-Timestamp': timestampSeed.toString()
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (!json.data || !Array.isArray(json.data)) return;

          for (const row of json.data) {
            if (!row.s || !row.d) continue;
            const sym = row.s.replace('EGX:', '').toUpperCase();
            const [name, closePrice, changePercent, volume, dayHigh, dayLow] = row.d;
            if (typeof closePrice !== 'number' || closePrice <= 0) continue;

            const currentPrice = Number(closePrice.toFixed(2));
            const changePct = Number((changePercent || 0).toFixed(2));
            const changeVal = Number(((currentPrice * changePct) / 100).toFixed(2));

            const update: EgxLiveScraperQuote = {
              symbol: sym,
              price: currentPrice,
              change: changeVal,
              changePercent: changePct,
              volume: volume || 0,
              high: Number((dayHigh || currentPrice).toFixed(2)),
              low: Number((dayLow || currentPrice).toFixed(2)),
              timestamp: Date.now()
            };

            const prev = this.cache.get(sym);
            // Detect price or tick change
            if (!prev || prev.price !== update.price || prev.volume !== update.volume) {
              this.cache.set(sym, update);
              const wsPayload: WsPriceUpdate = {
                symbol: update.symbol,
                price: update.price,
                change: update.change,
                changePercent: update.changePercent,
                volume: update.volume,
                high: update.high,
                low: update.low,
                timestamp: update.timestamp,
                source: 'egx_live_ws'
              };
              this.emit('priceTick', wsPayload);
            }
          }
        } catch (err) {
          // Silent catch to keep loop smooth
        }
      });
    });

    req.on('error', () => {
      // Ignored for high-frequency poller
    });

    req.write(postData);
    req.end();
  }
}
