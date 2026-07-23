import { StockQuote, StockAnalysisResult, SignalType, TechnicalIndicators } from '../types/stock';
import { StockMeta } from '../constants/stocks';

export class SignalDetectorService {
  analyzeStockWithIndicators(
    stock: StockMeta,
    quote: StockQuote,
    indicators: TechnicalIndicators,
    automatedFairValue: number
  ): StockAnalysisResult {
    const price = quote.currentPrice;
    const reasons: string[] = [];
    let signalScore = 0; // Negative = Sell, Positive = Buy

    const fairValue = automatedFairValue;
    const fairValueUpsidePercent = Number((((fairValue - price) / price) * 100).toFixed(2));

    // Fair Value Signal factor
    if (fairValueUpsidePercent >= 10) {
      signalScore += 2;
      reasons.push(`💎 UNDERVALUED (فرصة نمو): Current price is ${fairValueUpsidePercent}% below automated Fair Value (${fairValue} EGP).`);
    } else if (fairValueUpsidePercent <= -8) {
      signalScore -= 1;
      reasons.push(`⚠️ OVERVALUED (أعلى من القيمة العادلة): Current price exceeds automated Fair Value (${fairValue} EGP) by ${Math.abs(fairValueUpsidePercent)}%.`);
    }

    // 1. RSI Rules
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

    // 2. Moving Average Rules
    if (indicators.sma20 > indicators.sma50) {
      signalScore += 1;
      reasons.push(`✨ Bullish Trend: SMA 20 (${indicators.sma20}) is above SMA 50 (${indicators.sma50}).`);
    } else if (indicators.sma20 < indicators.sma50) {
      signalScore -= 1;
      reasons.push(`🔻 Bearish Trend: SMA 20 (${indicators.sma20}) is below SMA 50 (${indicators.sma50}).`);
    }

    // 3. Support / Resistance Breakout Rules
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

    // Classify Signal Type
    let signalType: SignalType = 'NEUTRAL';
    if (signalScore >= 3) {
      signalType = 'STRONG_BUY';
    } else if (signalScore >= 1) {
      signalType = 'BUY';
    } else if (signalScore <= -3) {
      signalType = 'STRONG_SELL';
    } else if (signalScore <= -1) {
      signalType = 'SELL';
    }

    if (reasons.length === 0) {
      reasons.push(`Price is consolidating stably around ${price} EGP.`);
    }

    // Calculate Targets and Stop Loss
    const suggestedEntry = {
      min: Number((indicators.support * 1.005).toFixed(2)),
      max: Number((indicators.support * 1.03).toFixed(2)),
    };

    const suggestedTarget = {
      target1: Number((indicators.resistance * 0.99).toFixed(2)),
      target2: Number((Math.max(indicators.resistance * 1.05, fairValue)).toFixed(2)),
    };

    const suggestedStopLoss = Number((indicators.support * 0.96).toFixed(2));

    return {
      quote,
      indicators,
      signalType,
      reasons,
      fairValue,
      fairValueUpsidePercent,
      suggestedEntry,
      suggestedTarget,
      suggestedStopLoss,
      timestamp: new Date(),
    };
  }

  // Compatibility method
  analyzeStock(stock: StockMeta, quote: StockQuote, candles: any[]): StockAnalysisResult {
    const indicators: TechnicalIndicators = {
      rsi: 50,
      sma20: quote.currentPrice,
      sma50: quote.currentPrice,
      support: stock.defaultSupport || quote.currentPrice * 0.95,
      resistance: stock.defaultResistance || quote.currentPrice * 1.05,
      volumeSpike: false,
      volumeRatio: 1,
    };
    return this.analyzeStockWithIndicators(stock, quote, indicators, quote.currentPrice * 1.1);
  }
}
