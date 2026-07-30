import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const defaultStocks = [
      {
        stock: { symbol: 'MPCI', nameAr: 'ممفيس للأدوية والصناعات الكيماوية', sector: 'الأدوية', shariaCompliant: true },
        quote: { price: 54.2, changePercent: 4.03, volume: 185400, dayHigh: 55.5, dayLow: 52.8 },
        indicators: { rsi: 62.4, sma20: 51.8, sma50: 48.5, peRatio: 7.84, macd: { macd: 1.45, signal: 1.10 }, adx: 24.5, atr: 2.15 },
        automatedFairValue: 86.5,
        upsidePotentialPercent: 59.59,
        decision: { action: 'BUY', score: 4.5, signalType: 'STRONG_BUY', confidence: 'HIGH' },
        tradingPlan: { safeEntryMin: 52.0, safeEntryMax: 54.5, target1: 65.0, target2: 86.5, stopLoss: 49.5, riskRewardRatio: '1:3.2', positionSizePercent: 12 }
      },
      {
        stock: { symbol: 'AMOC', nameAr: 'الإسكندرية للزيوت المعدنية', sector: 'الطاقة والبترول', shariaCompliant: true },
        quote: { price: 9.85, changePercent: 2.6, volume: 3450000, dayHigh: 10.1, dayLow: 9.6 },
        indicators: { rsi: 58.2, sma20: 9.4, sma50: 9.1, peRatio: 6.95, macd: { macd: 0.25, signal: 0.18 }, adx: 21.0, atr: 0.42 },
        automatedFairValue: 14.2,
        upsidePotentialPercent: 44.16,
        decision: { action: 'BUY', score: 4.2, signalType: 'BUY', confidence: 'HIGH' },
        tradingPlan: { safeEntryMin: 9.5, safeEntryMax: 9.85, target1: 11.8, target2: 14.2, stopLoss: 9.1, riskRewardRatio: '1:2.8', positionSizePercent: 10 }
      },
      {
        stock: { symbol: 'ETEL', nameAr: 'المصرية للاتصالات', sector: 'الاتصالات', shariaCompliant: true },
        quote: { price: 38.5, changePercent: 1.85, volume: 1250000, dayHigh: 39.2, dayLow: 37.8 },
        indicators: { rsi: 55.4, sma20: 36.8, sma50: 35.2, peRatio: 8.12, macd: { macd: 0.85, signal: 0.65 }, adx: 28.4, atr: 1.35 },
        automatedFairValue: 56.0,
        upsidePotentialPercent: 45.45,
        decision: { action: 'BUY', score: 4.0, signalType: 'BUY', confidence: 'HIGH' },
        tradingPlan: { safeEntryMin: 37.2, safeEntryMax: 38.5, target1: 45.0, target2: 56.0, stopLoss: 35.5, riskRewardRatio: '1:3.0', positionSizePercent: 10 }
      },
      {
        stock: { symbol: 'ORAS', nameAr: 'أوراسكوم كونستراكشون', sector: 'المقاولات', shariaCompliant: true },
        quote: { price: 285.0, changePercent: 3.52, volume: 84000, dayHigh: 291.0, dayLow: 278.0 },
        indicators: { rsi: 64.1, sma20: 272.0, sma50: 258.0, peRatio: 9.45, macd: { macd: 6.8, signal: 5.2 }, adx: 31.2, atr: 9.5 },
        automatedFairValue: 390.0,
        upsidePotentialPercent: 36.84,
        decision: { action: 'BUY', score: 4.3, signalType: 'BUY', confidence: 'HIGH' },
        tradingPlan: { safeEntryMin: 275.0, safeEntryMax: 285.0, target1: 330.0, target2: 390.0, stopLoss: 262.0, riskRewardRatio: '1:2.9', positionSizePercent: 12 }
      },
      {
        stock: { symbol: 'SWDY', nameAr: 'السويدى إلكتريك', sector: 'الصناعة والكهرباء', shariaCompliant: true },
        quote: { price: 46.5, changePercent: 1.53, volume: 2100000, dayHigh: 47.2, dayLow: 45.8 },
        indicators: { rsi: 59.8, sma20: 44.2, sma50: 41.8, peRatio: 8.9, macd: { macd: 1.15, signal: 0.92 }, adx: 26.8, atr: 1.6 },
        automatedFairValue: 68.0,
        upsidePotentialPercent: 46.24,
        decision: { action: 'BUY', score: 4.1, signalType: 'BUY', confidence: 'HIGH' },
        tradingPlan: { safeEntryMin: 45.0, safeEntryMax: 46.5, target1: 55.0, target2: 68.0, stopLoss: 43.0, riskRewardRatio: '1:2.8', positionSizePercent: 10 }
      },
      {
        stock: { symbol: 'JUFO', nameAr: 'جهينة للصناعات الغذائية', sector: 'الأغذية والمشروبات', shariaCompliant: true },
        quote: { price: 22.4, changePercent: 0.9, volume: 980000, dayHigh: 22.8, dayLow: 22.1 },
        indicators: { rsi: 52.1, sma20: 21.8, sma50: 20.9, peRatio: 10.2, macd: { macd: 0.42, signal: 0.35 }, adx: 19.5, atr: 0.75 },
        automatedFairValue: 32.5,
        upsidePotentialPercent: 45.09,
        decision: { action: 'BUY', score: 3.8, signalType: 'BUY', confidence: 'MEDIUM' },
        tradingPlan: { safeEntryMin: 21.8, safeEntryMax: 22.4, target1: 27.0, target2: 32.5, stopLoss: 20.8, riskRewardRatio: '1:2.6', positionSizePercent: 8 }
      }
    ];

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(defaultStocks);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
