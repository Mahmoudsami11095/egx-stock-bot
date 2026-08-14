import fs from 'fs';
import path from 'path';
import { StockQuote, StockAnalysisResult, SignalType, TechnicalIndicators, FairValueConfidence, MarketRegime } from '../types/stock';
import { StockMeta, getStockFxSensitivity, BASE_USD_EGP_RATE } from '../constants/stocks';
import { logger } from './logger';

export class SignalDetectorService {
  private historyFilePath = path.join(process.cwd(), 'data', 'signal_history.json');

  constructor() {
    if (process.env.VERCEL) return;
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } catch (_) {
      // Ignore
    }
  }

  private logSignalHistory(analysis: StockAnalysisResult): void {
    if (process.env.VERCEL) return;
    // Fire-and-forget async write to avoid blocking the event loop during batch scans
    try {
      const historyFilePath = this.historyFilePath;
      const entry = {
        symbol: analysis.quote.symbol,
        timestamp: new Date().toISOString(),
        signalType: analysis.signalType,
        signalScore: analysis.signalScore,
        currentPrice: analysis.quote.currentPrice,
        fairValue: analysis.fairValue,
        fairValueConfidence: analysis.fairValueConfidence,
        marketRegime: analysis.marketRegime,
        suggestedTarget1: analysis.suggestedTarget.target1,
        suggestedStopLoss: analysis.suggestedStopLoss,
        positionSizePercent: analysis.positionSizePercent,
        riskRewardRatio: analysis.riskRewardRatio,
      };

      // Use setImmediate to defer the synchronous file I/O out of the hot path
      setImmediate(() => {
        try {
          let history: any[] = [];
          if (fs.existsSync(historyFilePath)) {
            const raw = fs.readFileSync(historyFilePath, 'utf8');
            history = JSON.parse(raw);
          }
          history.push(entry);
          // Keep last 500 signals
          if (history.length > 500) history = history.slice(-500);
          fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
        } catch (_) {
          // Gracefully ignore filesystem write errors on read-only serverless hosts
        }
      });
    } catch (_) {
      // Gracefully ignore filesystem write errors on read-only serverless hosts
    }
  }

  analyzeStockWithIndicators(
    stock: StockMeta,
    quote: StockQuote,
    indicators: TechnicalIndicators,
    automatedFairValue: number,
    fairValueConfidence: FairValueConfidence = 'LOW',
    marketRegime: MarketRegime = 'UNKNOWN'
  ): StockAnalysisResult {
    const price = quote.currentPrice;
    const reasons: string[] = [];

    // --- WEIGHTED COMPOSITE SIGNAL SCORING ---
    // Each factor outputs a component score in [-2, +2] range
    // Final score = weighted sum of all component scores
    const weights = {
      valuation: 0.30,
      trend: 0.25,
      rsi: 0.20,
      volume: 0.15,
      macd: 0.10,
    };

    const fairValue = automatedFairValue;
    const fairValueUpsidePercent = Number((((fairValue - price) / price) * 100).toFixed(2));

    // Factor 1: Valuation Gap (weight: 0.30)
    let valuationScore = 0;
    if (fairValueUpsidePercent >= 30) {
      valuationScore = 2;
      reasons.push(`💎 DEEPLY UNDERVALUED: ${fairValueUpsidePercent}% below Fair Value (${fairValue} EGP).`);
    } else if (fairValueUpsidePercent >= 15) {
      valuationScore = 1;
      reasons.push(`💎 UNDERVALUED: ${fairValueUpsidePercent}% below Fair Value (${fairValue} EGP).`);
    } else if (fairValueUpsidePercent <= -25) {
      valuationScore = -2;
      reasons.push(`🚨 SEVERELY OVERVALUED: ${Math.abs(fairValueUpsidePercent)}% above Fair Value (${fairValue} EGP).`);
    } else if (fairValueUpsidePercent <= -10) {
      valuationScore = -1;
      reasons.push(`⚠️ OVERVALUED: ${Math.abs(fairValueUpsidePercent)}% above Fair Value (${fairValue} EGP).`);
    }

    // Factor 2: RSI (weight: 0.20)
    let rsiScore = 0;
    if (indicators.rsi < 30) {
      rsiScore = 2;
      reasons.push(`🚀 RSI (${indicators.rsi}) Oversold (<30) - Strong rebound opportunity.`);
    } else if (indicators.rsi < 40) {
      rsiScore = 1;
      reasons.push(`📈 RSI (${indicators.rsi}) in bullish accumulation zone.`);
    } else if (indicators.rsi > 75) {
      rsiScore = -2;
      reasons.push(`🚨 RSI (${indicators.rsi}) Extreme Overbought (>75) - Peak danger.`);
    } else if (indicators.rsi > 65) {
      rsiScore = -1;
      reasons.push(`⚠️ RSI (${indicators.rsi}) in Overbought zone (>65).`);
    } else if (indicators.rsi > 60) {
      rsiScore = -0.5;
      reasons.push(`📊 RSI (${indicators.rsi}) elevated — early overbought signal.`);
    }

    // Factor 3: MACD Crossover (weight: 0.10)
    let macdScore = 0;
    if (indicators.macd?.macd !== undefined && indicators.macd?.signal !== undefined) {
      if (indicators.macd.macd > indicators.macd.signal) {
        macdScore = 1;
        reasons.push(`✨ MACD Bullish: Line (${indicators.macd.macd}) > Signal (${indicators.macd.signal}).`);
      } else if (indicators.macd.macd < indicators.macd.signal) {
        macdScore = -1;
        reasons.push(`🔻 MACD Bearish: Line (${indicators.macd.macd}) < Signal (${indicators.macd.signal}).`);
      }
    }

    // Factor 4: ADX-Weighted Trend (SMA20 vs SMA50) (weight: 0.25)
    const isWeakTrend = (indicators.adx || 20) < 20;
    const trendDampen = isWeakTrend ? 0.5 : 1.0;
    let trendScore = 0;
    if (isWeakTrend) {
      reasons.push(`ℹ️ ADX (${indicators.adx || 20}) low trend - signal weight reduced.`);
    }
    if (indicators.sma20 > indicators.sma50) {
      trendScore = 1 * trendDampen;
      reasons.push(`✨ Bullish: SMA20 (${indicators.sma20}) > SMA50 (${indicators.sma50}).`);
    } else if (indicators.sma20 < indicators.sma50) {
      trendScore = -1 * trendDampen;
      reasons.push(`🔻 Bearish: SMA20 (${indicators.sma20}) < SMA50 (${indicators.sma50}).`);
    }

    // Factor 5: Volume Profile (weight: 0.15)
    let volumeScore = 0;
    if (indicators.volumeRatio >= 1.5) {
      volumeScore = 1;
      reasons.push(`🔥 Volume Spike: ${indicators.volumeRatio}× average (institutional interest).`);
    } else if (indicators.volumeRatio < 0.8) {
      volumeScore = -1;
      reasons.push(`📉 Low Volume: ${indicators.volumeRatio}× average (weak conviction).`);
    }

    // Support / Resistance Breakout (bonus, not weighted — additive)
    let breakoutBonus = 0;
    const distToResistance = ((indicators.resistance - price) / price) * 100;
    const distToSupport = ((price - indicators.support) / price) * 100;

    if (price >= indicators.resistance && indicators.volumeSpike) {
      breakoutBonus = 1.5;
      reasons.push(`🔥 BREAKOUT CONFIRMED: Broke resistance ${indicators.resistance} EGP with volume ${indicators.volumeRatio}× avg!`);
    } else if (distToSupport <= 3 && price >= indicators.support) {
      breakoutBonus = 0.5;
      reasons.push(`🎯 Near Support (${indicators.support} EGP) - good entry zone.`);
    } else if (price < indicators.support) {
      breakoutBonus = -1.5;
      reasons.push(`🚨 STOP LOSS: Price broke below Support (${indicators.support} EGP).`);
    }

    // Weighted Composite Score
    // Subtract volume's weighted contribution from breakout bonus to avoid double-counting
    const volumeOverlap = (breakoutBonus > 0 && volumeScore > 0) ? volumeScore * weights.volume : 0;
    let signalScore = (
      valuationScore * weights.valuation +
      rsiScore * weights.rsi +
      macdScore * weights.macd +
      trendScore * weights.trend +
      volumeScore * weights.volume +
      breakoutBonus * 0.30 - volumeOverlap  // Breakout carries 30% weight, deduplicate volume
    );

    // Market Regime Override (Fix #2 from Kimi)
    if (marketRegime === 'BEARISH' && signalScore > 0) {
      signalScore *= 0.5; // Halve bullish signals in bear market
      reasons.push(`⚠️ Bear Market Filter: EGX30 BEARISH regime — bullish signals dampened.`);
    }

    signalScore = Number(signalScore.toFixed(2));

    // Classify Signal Type (weighted thresholds)
    let signalType: SignalType = 'NEUTRAL';
    if (signalScore >= 1.5) {
      signalType = 'STRONG_BUY';
    } else if (signalScore >= 0.5) {
      signalType = 'BUY';
    } else if (signalScore <= -1.5) {
      signalType = 'STRONG_SELL';
    } else if (signalScore <= -0.5) {
      signalType = 'SELL';
    }

    if (reasons.length === 0) {
      reasons.push(`Price consolidating around ${price} EGP.`);
    }

    // ATR-Based Trading Plan (Fix #1 from Kimi)
    const atr = indicators.atr || price * 0.02;

    const suggestedEntry = {
      min: Number((price - 0.5 * atr).toFixed(2)),
      max: Number((price + 0.5 * atr).toFixed(2)),
    };

    const suggestedTarget = {
      target1: Number((price + 2.0 * atr).toFixed(2)),
      target2: Number((Math.max(price + 3.0 * atr, fairValue)).toFixed(2)),
    };

    const suggestedStopLoss = Number((price - 1.5 * atr).toFixed(2));

    // Risk-Adjusted Position Sizing (1% portfolio risk per trade, capped at 15%)
    // Floor at 0.5% of price to prevent near-zero ATR from producing absurd sizes
    const riskPerShare = Math.max(price * 0.005, price - suggestedStopLoss);
    const riskPercent = riskPerShare / price;
    const positionSizePercent = Number(Math.min(15, Math.max(1, Number((1 / riskPercent).toFixed(1)))).toFixed(1));

    // Liquidity cap: max 20% of average daily volume
    const adv = (quote.avgVolume || 1) * price;
    let liquidityCapWarning: string | undefined = undefined;
    if (adv < 250_000) {
      liquidityCapWarning = `⚠️ سيولة منخفضة جداً: معدل التداول اليومي (${(adv/1000).toFixed(0)} ألف ج.م) قد يؤدي إلى انزلاق سعري (Slippage) عند الشراء أو البيع ببعض المحافظ الكبيرة.`;
    } else if (adv < 1_000_000) {
      liquidityCapWarning = `⚠️ سيولة متوسطة-منخفضة: معدل التداول اليومي (${(adv/1000).toFixed(0)} ألف ج.م). تجنب الدخول بأحجام كبيرة دفعة واحدة لعدم التأثير على السعر.`;
    }

    const fxSensitivity = getStockFxSensitivity(stock.sector);
    const usdEgpRate = 49.5; // current realistic rate
    const devaluationPct = Math.max(0, (usdEgpRate - BASE_USD_EGP_RATE) / BASE_USD_EGP_RATE);
    const devaluationAdjustment = Number((1 + fxSensitivity * devaluationPct).toFixed(3));

    const rewardPerShare = suggestedTarget.target1 - price;
    const riskRewardRatio = Number(Math.max(0, rewardPerShare / riskPerShare).toFixed(2));

    // --- INTRADAY SCALPING ALGORITHM (المضاربة اليومية) ---
    // 1. Pivot Points (Standard)
    const dayHigh = quote.dayHigh || price;
    const dayLow = quote.dayLow || price;
    const pivotPoint = (dayHigh + dayLow + price) / 3;
    const r1 = (2 * pivotPoint) - dayLow;
    const r2 = pivotPoint + (dayHigh - dayLow);
    const s1 = (2 * pivotPoint) - dayHigh;
    const s2 = pivotPoint - (dayHigh - dayLow);

    let intradayScore = 0;
    const intradayReasons: string[] = [];

    // 2. Score Calculation
    // Price Action vs Pivot
    if (price > pivotPoint) {
      intradayScore += 1;
      intradayReasons.push(`السعر يتداول أعلى نقطة الارتكاز (${pivotPoint.toFixed(2)}) - إيجابي لحظياً`);
    } else if (price < pivotPoint) {
      intradayScore -= 1;
      intradayReasons.push(`السعر يتداول أسفل نقطة الارتكاز (${pivotPoint.toFixed(2)}) - سلبي لحظياً`);
    }

    // Volume Velocity
    if (indicators.volumeSpike) {
      intradayScore += 1.5;
      intradayReasons.push(`🔥 سيولة عالية وزخم تداول مرتفع (${indicators.volumeRatio}x المتوسط)`);
    } else if (indicators.volumeRatio < 0.5) {
      intradayScore -= 0.5;
      intradayReasons.push(`ضعف في السيولة اللحظية (${indicators.volumeRatio}x المتوسط)`);
    }

    // Momentum (RSI)
    if (indicators.rsi > 55 && indicators.rsi < 70) {
      intradayScore += 0.5;
      intradayReasons.push(`عزم إيجابي متصاعد (RSI: ${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi < 30) {
      intradayScore += 0.5;
      intradayReasons.push(`تشبع بيعي - فرصة ارتداد لحظي (RSI: ${indicators.rsi.toFixed(1)})`);
    } else if (indicators.rsi > 75) {
      intradayScore -= 1;
      intradayReasons.push(`تشبع شرائي خطر للمضارب (RSI: ${indicators.rsi.toFixed(1)})`);
    }

    // Trend (MACD)
    if (indicators.macd?.macd !== undefined && indicators.macd?.signal !== undefined) {
      if (indicators.macd.macd > indicators.macd.signal) {
        intradayScore += 0.5;
      } else {
        intradayScore -= 0.5;
      }
    }

    // Cap score between -3 and +3
    intradayScore = Math.max(-3, Math.min(3, Number(intradayScore.toFixed(2))));

    // 3. Classify Signal
    let intradaySignal: SignalType = 'NEUTRAL';
    if (intradayScore >= 2) intradaySignal = 'STRONG_BUY';
    else if (intradayScore >= 1) intradaySignal = 'BUY';
    else if (intradayScore <= -2) intradaySignal = 'STRONG_SELL';
    else if (intradayScore <= -1) intradaySignal = 'SELL';

    // 4. Targets and Stops
    const intradayEntry = Number(price.toFixed(2));
    let intradayTarget = Number(r1.toFixed(2));
    if (intradaySignal === 'STRONG_BUY') intradayTarget = Number(r2.toFixed(2));
    
    // Tight stop loss: below S1 or Pivot, max -2% risk
    let rawStop = price > pivotPoint ? pivotPoint : s1;
    const maxRiskPrice = price * 0.98; // max 2% loss
    const intradayStopLoss = Number(Math.max(rawStop, maxRiskPrice).toFixed(2));

    if (intradayReasons.length === 0) {
      intradayReasons.push(`حركة عرضية وضعف في الزخم اللحظي`);
    }

    // --- PROFESSIONAL STRATEGIES ---
    // Short-Term (1-3 months)
    let stAction = 'احتفاظ (Hold)';
    let stBadge = 'ترقب';
    let stReason = 'السهم يتداول في مسار عرضي، يُنصح بالاحتفاظ مع الالتزام بوقف الخسارة.';
    if (indicators.sma20 > indicators.sma50 && indicators.macd && indicators.macd.macd !== undefined && indicators.macd.signal !== undefined && indicators.macd.macd > indicators.macd.signal) {
      stAction = 'تجميع فني (Buy/Accumulate)';
      stBadge = 'إيجابي';
      stReason = 'اتجاه صاعد على المدى القصير مع زخم إيجابي للماكد. ينصح بالتجميع بالقرب من مناطق الدعم.';
    } else if (indicators.sma20 < indicators.sma50 && indicators.rsi < 40) {
      stAction = 'ترقب ارتداد (Watch)';
      stBadge = 'مراقبة';
      stReason = 'السهم في مسار هابط ولكن يقترب من مناطق تشبع بيعي. ننتظر إشارة انعكاس.';
    } else if (indicators.rsi > 70) {
      stAction = 'جني أرباح جزئي (Take Profit)';
      stBadge = 'مخاطرة';
      stReason = 'السهم في مناطق تشبع شرائي قوية، يُنصح بتخفيف المراكز وجني الأرباح.';
    }
    const shortTermRec = {
      action: stAction,
      badge: stBadge,
      reason: stReason,
      targetPrice: suggestedTarget.target1,
      stopLoss: suggestedStopLoss
    };

    // Long-Term (1-3 years)
    let ltAction = 'احتفاظ استثماري (Hold)';
    let ltBadge = 'عادل';
    let ltReason = 'السهم يتداول بالقرب من قيمته العادلة الأساسية.';
    if (fairValueUpsidePercent >= 20) {
      ltAction = 'استثمار طويل الأجل (Strong Buy)';
      ltBadge = 'فرصة قيمة';
      ltReason = 'السهم يتداول بخصم كبير عن قيمته العادلة، يمثل فرصة استثمارية ممتازة بناءً على الأساسيات.';
    } else if (fairValueUpsidePercent >= 5) {
      ltAction = 'تجميع استثماري (Accumulate)';
      ltBadge = 'أقل من القيمة';
      ltReason = 'السهم يتداول دون قيمته العادلة، يُنصح ببناء مراكز استثمارية تدريجياً.';
    } else if (fairValueUpsidePercent <= -15) {
      ltAction = 'تخفيف مراكز (Reduce)';
      ltBadge = 'مبالغة سعرية';
      ltReason = 'السهم يتداول بعلاوة سعرية عالية فوق قيمته العادلة، يُنصح بجني الأرباح لتجنب التصحيح.';
    }
    const longTermRec = {
      action: ltAction,
      badge: ltBadge,
      reason: ltReason,
      targetPrice: fairValue
    };

    const result: StockAnalysisResult = {
      quote: {
        ...quote,
        dividendYield: quote.dividendYield,
        dividendPerShare: quote.dividendPerShare
      },
      indicators,
      signalType,
      signalScore,
      reasons,
      fairValue,
      fairValueConfidence,
      fairValueUpsidePercent,
      marketRegime,
      suggestedEntry,
      suggestedTarget,
      suggestedStopLoss,
      positionSizePercent,
      riskRewardRatio,
      timestamp: new Date(),
      fxSensitivity,
      devaluationAdjustment,
      liquidityCapWarning,
      intradaySignal,
      intradayScore,
      intradayReasons,
      intradayEntry,
      intradayTarget,
      intradayStopLoss,
      shortTermRec,
      longTermRec,
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
