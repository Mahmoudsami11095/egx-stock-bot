import http from 'https';
import { StockQuote, Candle, TechnicalIndicators, MarketRegime } from '../types/stock';
import { StockMeta, getSectorPE } from '../constants/stocks';
import { logger } from './logger';

export interface BatchStockResult {
  stock: StockMeta;
  quote: StockQuote;
  indicators: TechnicalIndicators;
  automatedFairValue: number;
  fairValueConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Circuit Breaker State
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
let lastSuccessfulResponse: BatchStockResult[] | null = null;

// Market Regime Cache
let cachedMarketRegime: MarketRegime = 'UNKNOWN';
let cachedUsdEgp: number = 0;
let lastUsdEgpFetch: number = 0;

export class DataFetcherService {

  /**
   * Detects broad EGX30 market regime (BULLISH/BEARISH) and USD/EGP macro rate.
   * Called once per scan cycle before individual stock analysis.
   */
  async detectMarketRegime(): Promise<{ regime: MarketRegime; usdEgp: number }> {
    return new Promise((resolve) => {
      const postData = JSON.stringify({
        symbols: { tickers: ['EGX:EGX30'] },
        columns: ['close', 'SMA20', 'SMA50', 'RSI', 'ATR']
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
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            const row = json.data?.[0];
            if (row?.d) {
              const [close, sma20, sma50] = row.d;
              cachedMarketRegime = (close > sma20 && sma20 > sma50) ? 'BULLISH' : 'BEARISH';
              logger.info(`📊 Market Regime: ${cachedMarketRegime} (EGX30: ${close}, SMA20: ${sma20?.toFixed(0)}, SMA50: ${sma50?.toFixed(0)})`);
            }
          } catch (e) {
            logger.error(`Error detecting market regime: ${e}`);
          }
          resolve({ regime: cachedMarketRegime, usdEgp: cachedUsdEgp });
        });
      });
      req.on('error', () => resolve({ regime: cachedMarketRegime, usdEgp: cachedUsdEgp }));
      req.write(postData);
      req.end();
    });
  }

  /**
   * Fetches USD/EGP exchange rate for macro devaluation detection.
   */
  async fetchUsdEgp(): Promise<number> {
    // Cache for 1 hour
    if (cachedUsdEgp > 0 && Date.now() - lastUsdEgpFetch < 3600000) return cachedUsdEgp;

    return new Promise((resolve) => {
      const postData = JSON.stringify({
        symbols: { tickers: ['FX_IDC:USDEGP'] },
        columns: ['close', 'change']
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
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            const row = json.data?.[0];
            if (row?.d?.[0]) {
              cachedUsdEgp = row.d[0];
              lastUsdEgpFetch = Date.now();
              logger.info(`💱 USD/EGP: ${cachedUsdEgp}`);
            }
          } catch (e) {
            logger.error(`Error fetching USD/EGP: ${e}`);
          }
          resolve(cachedUsdEgp);
        });
      });
      req.on('error', () => resolve(cachedUsdEgp));
      req.write(postData);
      req.end();
    });
  }

  getMarketRegime(): MarketRegime {
    return cachedMarketRegime;
  }

  /**
   * Batch fetches real-time stock quotes, technical indicators, and automated Fair Value
   * with circuit breaker protection and ATR-based volatility targets.
   */
  async getBatchQuoteAndIndicators(stocks: StockMeta[]): Promise<BatchStockResult[]> {
    if (!stocks || stocks.length === 0) return [];

    // Circuit Breaker: If open, return cached data
    if (Date.now() < circuitOpenUntil) {
      logger.warn(`⚡ Circuit Breaker OPEN until ${new Date(circuitOpenUntil).toISOString()}. Using cached data.`);
      return lastSuccessfulResponse || [];
    }

    const tickerMap = new Map<string, StockMeta>();
    const tvTickers: string[] = [];

    for (const s of stocks) {
      const tvSym = `EGX:${s.symbol.toUpperCase()}`;
      tickerMap.set(tvSym, s);
      tvTickers.push(tvSym);
    }

    const postData = JSON.stringify({
      symbols: {
        tickers: tvTickers
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
        'Recommend.All',
        'MACD.macd',
        'MACD.signal',
        'ADX',
        'ATR'
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
            const results: BatchStockResult[] = [];

            for (const row of json.data || []) {
              const tvSymbol = row.s;
              const stock: StockMeta = tickerMap.get(tvSymbol) || {
                symbol: tvSymbol.replace('EGX:', ''),
                yahooSymbol: `${tvSymbol.replace('EGX:', '')}.CA`,
                nameEn: tvSymbol.replace('EGX:', ''),
                nameAr: tvSymbol.replace('EGX:', ''),
                sector: 'General',
              };

              if (!row.d) continue;

              const [
                name,
                closePrice,
                changePercent,
                volume,
                avgVolume,
                dayHigh,
                dayLow,
                fiftyTwoWeekHigh,
                fiftyTwoWeekLow,
                rsi,
                sma20,
                sma50,
                peRatio,
                eps,
                recommendScore,
                macdVal,
                macdSignalVal,
                adxVal,
                atrVal
              ] = row.d;

              const currentPrice = Number((closePrice || 0).toFixed(2));

              // Data validation guardrail
              if (currentPrice < 0.01 || currentPrice > 50000) continue;

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

              // Classic Pivot-Point Calculation using 52-week High/Low + Current Close
              const low52 = fiftyTwoWeekLow || currentPrice * 0.7;
              const high52 = fiftyTwoWeekHigh || currentPrice * 1.3;
              const pivotPoint = (high52 + low52 + currentPrice) / 3;
              
              const calculatedSupport = Number((2 * pivotPoint - high52).toFixed(2));
              const calculatedResistance = Number((2 * pivotPoint - low52).toFixed(2));

              const support = stock.defaultSupport || Math.max(0.01, Math.min(calculatedSupport, currentPrice * 0.98));
              const resistance = stock.defaultResistance || Math.max(currentPrice * 1.02, calculatedResistance);

              const volRatio = avgVolume && avgVolume > 0 ? Number((volume / avgVolume).toFixed(2)) : 1;

              const indicators: TechnicalIndicators = {
                rsi: rsi ? Number(rsi.toFixed(2)) : 50,
                sma20: sma20 ? Number(sma20.toFixed(2)) : currentPrice,
                sma50: sma50 ? Number(sma50.toFixed(2)) : currentPrice,
                macd: {
                  macd: macdVal ? Number(macdVal.toFixed(4)) : 0,
                  signal: macdSignalVal ? Number(macdSignalVal.toFixed(4)) : 0,
                  histogram: (macdVal && macdSignalVal) ? Number((macdVal - macdSignalVal).toFixed(4)) : 0,
                },
                adx: adxVal ? Number(adxVal.toFixed(2)) : 20,
                atr: atrVal ? Number(atrVal.toFixed(2)) : currentPrice * 0.02,
                support,
                resistance,
                volumeSpike: volRatio >= 1.5,
                volumeRatio: volRatio,
              };

              // Sector-Specific Fair Value Calculation with Macro Adjustment
              let automatedFairValue = currentPrice;
              let fairValueConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
              const sectorPE = getSectorPE(stock.sector);

              if (eps && eps > 0) {
                const peValuation = eps * sectorPE;
                const momentumMultiplier = 1 + ((recommendScore || 0) * 0.08);
                automatedFairValue = peValuation * momentumMultiplier;
                fairValueConfidence = 'HIGH';
              } else {
                // Volume-weighted Fibonacci structural fair value
                const rangeMidpoint = low52 + 0.618 * (high52 - low52);
                const volWeight = Math.min(volRatio, 2.0);
                const scoreFactor = 1 + (recommendScore || 0) * 0.1;
                automatedFairValue = rangeMidpoint * (0.85 + 0.15 * volWeight) * scoreFactor;
                automatedFairValue = Math.max(automatedFairValue, currentPrice * scoreFactor);
                fairValueConfidence = 'LOW';
              }

              // Safety Clamp: [0.85x price, 1.50x price]
              automatedFairValue = Math.max(currentPrice * 0.85, Math.min(currentPrice * 1.5, automatedFairValue));
              automatedFairValue = Number(automatedFairValue.toFixed(2));

              results.push({ stock, quote, indicators, automatedFairValue, fairValueConfidence });
            }

            // Circuit breaker success: reset failures, cache results
            consecutiveFailures = 0;
            lastSuccessfulResponse = results;

            resolve(results);
          } catch (err) {
            logger.error(`Error parsing TradingView batch response: ${err}`);
            consecutiveFailures++;
            if (consecutiveFailures >= 5) {
              circuitOpenUntil = Date.now() + 300_000; // Open for 5 minutes
              logger.warn(`🔴 Circuit Breaker OPENED after ${consecutiveFailures} consecutive failures.`);
            }
            if (lastSuccessfulResponse) {
              logger.warn(`⚡ Returning cached data from last successful scan.`);
              resolve(lastSuccessfulResponse);
            } else {
              reject(err);
            }
          }
        });
      });

      req.on('error', (e) => {
        logger.error(`TradingView batch API request failed: ${e.message}`);
        consecutiveFailures++;
        if (consecutiveFailures >= 5) {
          circuitOpenUntil = Date.now() + 300_000;
          logger.warn(`🔴 Circuit Breaker OPENED after ${consecutiveFailures} consecutive failures.`);
        }
        if (lastSuccessfulResponse) {
          resolve(lastSuccessfulResponse);
        } else {
          reject(e);
        }
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Single stock quote helper wrapper.
   */
  async getQuoteAndIndicators(stock: StockMeta): Promise<{ quote: StockQuote; indicators: TechnicalIndicators; automatedFairValue: number; fairValueConfidence: 'HIGH' | 'MEDIUM' | 'LOW' }> {
    const results = await this.getBatchQuoteAndIndicators([stock]);
    if (results.length > 0) {
      return {
        quote: results[0].quote,
        indicators: results[0].indicators,
        automatedFairValue: results[0].automatedFairValue,
        fairValueConfidence: results[0].fairValueConfidence,
      };
    }
    throw new Error(`No TradingView data returned for EGX:${stock.symbol}`);
  }

  async getQuote(stock: StockMeta): Promise<StockQuote> {
    const { quote } = await this.getQuoteAndIndicators(stock);
    return quote;
  }

  async getHistoricalCandles(stock: StockMeta, days: number = 90): Promise<Candle[]> {
    return [];
  }
}
