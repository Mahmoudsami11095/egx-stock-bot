import fs from 'fs';
import path from 'path';
import { StockQuote, StockAnalysisResult, SignalType, TechnicalIndicators } from '../types/stock';
import { StockMeta } from '../constants/stocks';
import { logger } from './logger';

export class SignalDetectorService {
  private historyFilePath = path.join(process.cwd(), 'data', 'signal_history.json');

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private logSignalHistory(analysis: StockAnalysisResult): void {
    try {
      let history: any[] = [];
      if (fs.existsSync(this.historyFilePath)) {
        const raw = fs.readFileSync(this.historyFilePath, 'utf8');
        history = JSON.parse(raw);
      }
      history.push({
        symbol: analysis.quote.symbol,
        timestamp: new Date().toISOString(),
        signalType: analysis.signalType,
        signalScore: analysis.signalScore,
        currentPrice: analysis.quote.currentPrice,
        fairValue: analysis.fairValue,
        suggestedTarget1: analysis.suggestedTarget.target1,
        suggestedStopLoss: analysis.suggestedStopLoss,
        positionSizePercent: analysis.positionSizePercent,
        riskRewardRatio: analysis.riskRewardRatio,
      });
      // Keep last 500 signals
      if (history.length > 500) history = history.slice(-500);
      fs.writeFileSync(this.historyFilePath, JSON.stringify(history, null, 2), 'utf8');
    } catch (e) {
      logger.error(`Error writing signal history log: ${e}`);
    }
  }

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

    // 2. MACD Rules (Moving Average Convergence Divergence)
    if (indicators.macd && indicators.macd.macd !== undefined && indicators.macd.signal !== undefined) {
      if (indicators.macd.macd > indicators.macd.signal) {
        signalScore += 1;
        reasons.push(`✨ MACD Bullish Crossover: MACD line (${indicators.macd.macd}) above Signal (${indicators.macd.signal}).`);
      } else if (indicators.macd.macd < indicators.macd.signal) {
        signalScore -= 1;
        reasons.push(`🔻 MACD Bearish Crossover: MACD line (${indicators.macd.macd}) below Signal (${indicators.macd.signal}).`);
      }
    }

    // 3. ADX Trend Filter (Average Directional Index)
    const isWeakTrend = (indicators.adx || 20) < 20;
    const trendWeight = isWeakTrend ? 0.5 : 1.0;
    if (isWeakTrend) {
      reasons.push(`ℹ️ ADX (${indicators.adx || 20}) indicates ranging / low trend strength market.`);
    }

    // 4. Moving Average Rules (weighted by ADX trend factor)
    if (indicators.sma20 > indicators.sma50) {
      signalScore += Math.round(1 * trendWeight);
      reasons.push(`✨ Bullish Trend: SMA 20 (${indicators.sma20}) is above SMA 50 (${indicators.sma50}).`);
    } else if (indicators.sma20 < indicators.sma50) {
      signalScore -= Math.round(1 * trendWeight);
      reasons.push(`🔻 Bearish Trend: SMA 20 (${indicators.sma20}) is below SMA 50 (${indicators.sma50}).`);
    }

    // 5. Support / Resistance Breakout Rules
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

    // Calculate Targets, Stop Loss & Position Sizing
    const suggestedEntry = {
      min: Number((indicators.support * 1.005).toFixed(2)),
      max: Number((indicators.support * 1.03).toFixed(2)),
    };

    const suggestedTarget = {
      target1: Number((indicators.resistance * 0.99).toFixed(2)),
      target2: Number((Math.max(indicators.resistance * 1.05, fairValue)).toFixed(2)),
    };

    const suggestedStopLoss = Number((indicators.support * 0.96).toFixed(2));

    // Risk-Adjusted Position Sizing (Fixed Fractional 2% Portfolio Risk Model)
    const riskPerShare = Math.max(0.01, price - suggestedStopLoss);
    const riskPercent = (riskPerShare / price);
    const positionSizePercent = Number(Math.min(15, Math.max(2, Number((2 / riskPercent).toFixed(1)))).toFixed(1));
    const rewardPerShare = suggestedTarget.target1 - price;
    const riskRewardRatio = Number((rewardPerShare / riskPerShare).toFixed(2));

    const result: StockAnalysisResult = {
      quote,
      indicators,
      signalType,
      signalScore,
      reasons,
      fairValue,
      fairValueUpsidePercent,
      suggestedEntry,
      suggestedTarget,
      suggestedStopLoss,
      positionSizePercent,
      riskRewardRatio,
      timestamp: new Date(),
    };

    // Log signal to history for backtesting
    this.logSignalHistory(result);

    return result;
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
