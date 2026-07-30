import http from 'https';
import { StockQuote, Candle, TechnicalIndicators } from '../types/stock';
import { StockMeta, getSectorPE } from '../constants/stocks';
import { logger } from './logger';

export interface BatchStockResult {
  stock: StockMeta;
  quote: StockQuote;
  indicators: TechnicalIndicators;
  automatedFairValue: number;
}

export class DataFetcherService {
  /**
   * Batch fetches accurate real-time stock quotes, technical indicators, and automated Fair Value for multiple EGX stocks in 1 single HTTP request (<1s).
   */
  async getBatchQuoteAndIndicators(stocks: StockMeta[]): Promise<BatchStockResult[]> {
    if (!stocks || stocks.length === 0) return [];

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
        'ADX'
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
                adxVal
              ] = row.d;

              const currentPrice = Number((closePrice || 0).toFixed(2));
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
                support,
                resistance,
                volumeSpike: volRatio >= 1.3,
                volumeRatio: volRatio,
              };

              // Sector-Specific Fair Value Calculation
              let automatedFairValue = currentPrice;
              const sectorPE = getSectorPE(stock.sector);

              if (eps && eps > 0) {
                const peValuation = eps * sectorPE;
                const momentumMultiplier = 1 + ((recommendScore || 0) * 0.08);
                automatedFairValue = peValuation * momentumMultiplier;
              } else {
                // Volume-weighted Fibonacci structural fair value
                const rangeMidpoint = low52 + 0.618 * (high52 - low52);
                const volWeight = Math.min(volRatio, 2.0); // Cap volume multiplier at 2.0
                const scoreFactor = 1 + (recommendScore || 0) * 0.1;
                automatedFairValue = rangeMidpoint * (0.85 + 0.15 * volWeight) * scoreFactor;
                automatedFairValue = Math.max(automatedFairValue, currentPrice * scoreFactor);
              }

              // Safety Clamp: [0.85x price, 1.50x price]
              automatedFairValue = Math.max(currentPrice * 0.85, Math.min(currentPrice * 1.5, automatedFairValue));
              automatedFairValue = Number(automatedFairValue.toFixed(2));

              results.push({ stock, quote, indicators, automatedFairValue });
            }

            resolve(results);
          } catch (err) {
            logger.error(`Error parsing TradingView batch response: ${err}`);
            reject(err);
          }
        });
      });

      req.on('error', (e) => {
        logger.error(`TradingView batch API request failed: ${e.message}`);
        reject(e);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Single stock quote helper wrapper.
   */
  async getQuoteAndIndicators(stock: StockMeta): Promise<{ quote: StockQuote; indicators: TechnicalIndicators; automatedFairValue: number }> {
    const results = await this.getBatchQuoteAndIndicators([stock]);
    if (results.length > 0) {
      return {
        quote: results[0].quote,
        indicators: results[0].indicators,
        automatedFairValue: results[0].automatedFairValue,
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
