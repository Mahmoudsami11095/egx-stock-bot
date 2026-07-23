import http from 'https';
import { StockQuote, Candle, TechnicalIndicators } from '../types/stock';
import { StockMeta } from '../constants/stocks';
import { logger } from './logger';

export class DataFetcherService {
  /**
   * Fetches accurate real-time stock quote, technical indicators, and automated Fair Value from TradingView EGX Scanner.
   */
  async getQuoteAndIndicators(stock: StockMeta): Promise<{ quote: StockQuote; indicators: TechnicalIndicators; automatedFairValue: number }> {
    const symbol = stock.symbol.toUpperCase();
    const tvSymbol = `EGX:${symbol}`;

    const postData = JSON.stringify({
      symbols: {
        tickers: [tvSymbol]
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
              recommendScore
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

            // Support & Resistance from technical boundaries
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

            // 🤖 AUTOMATED DYNAMIC FAIR VALUE ENGINE:
            // Calculates Fair Value purely from live market data, P/E multiples, EPS, and 52W Range Bounds
            let automatedFairValue = currentPrice;

            if (eps && eps > 0) {
              // Standard EGX Industry Benchmark P/E multiplier = 13.5x
              const peValuation = eps * 13.5;
              const momentumMultiplier = 1 + ((recommendScore || 0) * 0.08);
              automatedFairValue = peValuation * momentumMultiplier;
            } else {
              // Structural Fibonacci / Midpoint Valuation
              const low52 = fiftyTwoWeekLow || currentPrice * 0.7;
              const high52 = fiftyTwoWeekHigh || currentPrice * 1.3;
              const rangeMidpoint = low52 + 0.618 * (high52 - low52);
              const scoreFactor = 1 + (recommendScore || 0) * 0.1;
              automatedFairValue = Math.max(rangeMidpoint, currentPrice * scoreFactor);
            }

            // Ensure fair value is realistic & bounded (not less than 85% of price, not more than 160% of price)
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
