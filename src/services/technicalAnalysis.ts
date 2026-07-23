import { RSI, SMA } from 'technicalindicators';
import { Candle, TechnicalIndicators } from '../types/stock';
import { StockMeta } from '../constants/stocks';

export class TechnicalAnalysisService {
  /**
   * Computes technical indicators for a given set of daily candles.
   */
  calculateIndicators(stock: StockMeta, candles: Candle[], currentPrice: number, currentVolume: number): TechnicalIndicators {
    if (candles.length < 14) {
      // Fallback if historical data is short
      return {
        rsi: 50,
        sma20: currentPrice,
        sma50: currentPrice,
        support: stock.defaultSupport || currentPrice * 0.92,
        resistance: stock.defaultResistance || currentPrice * 1.08,
        volumeSpike: false,
        volumeRatio: 1,
      };
    }

    const closes = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);

    // Add current price/volume if not already at the end
    closes.push(currentPrice);
    volumes.push(currentVolume);

    // Calculate RSI (14)
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    const lastRsi = rsiValues.length > 0 ? Number(rsiValues[rsiValues.length - 1].toFixed(2)) : 50;

    // Calculate SMA (20)
    const sma20Values = SMA.calculate({ values: closes, period: 20 });
    const lastSma20 = sma20Values.length > 0 ? Number(sma20Values[sma20Values.length - 1].toFixed(2)) : currentPrice;

    // Calculate SMA (50)
    const sma50Values = SMA.calculate({ values: closes, period: 50 });
    const lastSma50 = sma50Values.length > 0 ? Number(sma50Values[sma50Values.length - 1].toFixed(2)) : lastSma20;

    // Calculate Support and Resistance from recent highs & lows
    const recentCandles = candles.slice(-30);
    const highs = recentCandles.map((c) => c.high);
    const lows = recentCandles.map((c) => c.low);

    const calculatedResistance = stock.defaultResistance || Math.max(...highs, currentPrice);
    const calculatedSupport = stock.defaultSupport || Math.min(...lows, currentPrice);

    // Calculate Volume Spike ratio
    const avgVolume20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(volumes.length, 20);
    const volumeRatio = avgVolume20 > 0 ? Number((currentVolume / avgVolume20).toFixed(2)) : 1;
    const volumeSpike = volumeRatio >= 1.3;

    return {
      rsi: lastRsi,
      sma20: lastSma20,
      sma50: lastSma50,
      support: Number(calculatedSupport.toFixed(2)),
      resistance: Number(calculatedResistance.toFixed(2)),
      volumeSpike,
      volumeRatio,
    };
  }
}
