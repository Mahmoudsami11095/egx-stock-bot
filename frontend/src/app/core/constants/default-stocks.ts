import { StockAnalysisResult, GoldPrices } from '../models/stock.model';

export const DEFAULT_STOCKS: StockAnalysisResult[] = [
  {
    quote: { symbol: 'MPCI', nameEn: 'Memphis Pharma', nameAr: 'ممفيس للأدوية والصناعات الكيماوية', currentPrice: 290.00, previousClose: 293.90, change: -3.90, changePercent: -1.36, dayHigh: 295.90, dayLow: 287.00, fiftyTwoWeekHigh: 298.90, fiftyTwoWeekLow: 90.60, volume: 431879, avgVolume: 421084, peRatio: 12.73 },
    indicators: { rsi: 74.6, sma20: 258.8, sma50: 235.8, support: 280.0, resistance: 310.0, volumeSpike: true, volumeRatio: 1.4 },
    signalType: 'STRONG_BUY', signalScore: 4.8, reasons: ['نمو إيرادات قوي +42%', 'ربحية سهم مرتفعة وتوزيعات نقدية'], fairValue: 430.00, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 48.28, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
    suggestedEntry: { min: 285.00, max: 292.00 }, suggestedTarget: { target1: 340.00, target2: 430.00 }, suggestedStopLoss: 275.00, positionSizePercent: 12, riskRewardRatio: 3.5
  },
  {
    quote: { symbol: 'ETEL', nameEn: 'Telecom Egypt', nameAr: 'المصرية للاتصالات', currentPrice: 103.60, previousClose: 106.80, change: -3.20, changePercent: -3.00, dayHigh: 107.09, dayLow: 102.75, fiftyTwoWeekHigh: 112.98, fiftyTwoWeekLow: 40.40, volume: 1511598, avgVolume: 827267, peRatio: 7.84 },
    indicators: { rsi: 62.4, sma20: 99.5, sma50: 96.4, support: 99.0, resistance: 112.0, volumeSpike: true, volumeRatio: 1.8 },
    signalType: 'BUY', signalScore: 4.1, reasons: ['تدفقات نقدية تشغيلية ضخمة بالدولار', 'مضاعف ربحية جاذب جداً (7.8)'], fairValue: 150.00, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 44.79, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
    suggestedEntry: { min: 100.00, max: 104.00 }, suggestedTarget: { target1: 125.00, target2: 150.00 }, suggestedStopLoss: 96.00, positionSizePercent: 10, riskRewardRatio: 3.1
  },
  {
    quote: { symbol: 'ORAS', nameEn: 'Orascom Construction', nameAr: 'أوراسكوم كونستراكشون', currentPrice: 712.20, previousClose: 717.90, change: -5.70, changePercent: -0.79, dayHigh: 719.50, dayLow: 702.00, fiftyTwoWeekHigh: 812.50, fiftyTwoWeekLow: 377.00, volume: 193879, avgVolume: 278667, peRatio: 6.32 },
    indicators: { rsi: 50.4, sma20: 704.3, sma50: 724.5, support: 700.0, resistance: 780.0, volumeSpike: false, volumeRatio: 0.9 },
    signalType: 'BUY', signalScore: 3.9, reasons: ['عقود دولارية متراكمة بملايين الدولارات', 'تقييم منخفض مقارنة بالقيمة العادلة'], fairValue: 980.00, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 37.60, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
    suggestedEntry: { min: 700.00, max: 715.00 }, suggestedTarget: { target1: 820.00, target2: 980.00 }, suggestedStopLoss: 670.00, positionSizePercent: 8, riskRewardRatio: 3.0
  },
  {
    quote: { symbol: 'ADIB', nameEn: 'Abu Dhabi Islamic Bank', nameAr: 'مصرف أبوظبي الإسلامي - مصر', currentPrice: 52.50, previousClose: 52.00, change: 0.50, changePercent: 0.96, dayHigh: 53.00, dayLow: 51.80, fiftyTwoWeekHigh: 58.50, fiftyTwoWeekLow: 32.00, volume: 1850420, avgVolume: 2100500, peRatio: 5.20 },
    indicators: { rsi: 65.2, sma20: 50.1, sma50: 48.3, support: 50.0, resistance: 56.0, volumeSpike: true, volumeRatio: 1.5 },
    signalType: 'STRONG_BUY', signalScore: 4.7, reasons: ['نمو إيرادات مصرفية إسلامية قياسي', 'عائد على الملكية يتجاوز 35% ومضاعف رخيص (5.2)'], fairValue: 85.00, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 61.90, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 مصرف إسلامي متوافق تام 100%',
    suggestedEntry: { min: 51.00, max: 53.00 }, suggestedTarget: { target1: 68.00, target2: 85.00 }, suggestedStopLoss: 48.50, positionSizePercent: 12, riskRewardRatio: 3.4
  },
  {
    quote: { symbol: 'SWDY', nameEn: 'Elsewedy Electric', nameAr: 'السويدى إليكتريك', currentPrice: 93.00, previousClose: 94.95, change: -1.95, changePercent: -2.05, dayHigh: 94.95, dayLow: 91.80, fiftyTwoWeekHigh: 97.50, fiftyTwoWeekLow: 62.00, volume: 270010, avgVolume: 210912, peRatio: 9.80 },
    indicators: { rsi: 57.7, sma20: 91.1, sma50: 89.0, support: 90.0, resistance: 98.0, volumeSpike: true, volumeRatio: 1.3 },
    signalType: 'BUY', signalScore: 3.7, reasons: ['توسع مشروعات البنية التحتية للطاقة', 'طلب قوي على التصدير'], fairValue: 135.00, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 45.16, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
    suggestedEntry: { min: 90.00, max: 93.50 }, suggestedTarget: { target1: 110.00, target2: 135.00 }, suggestedStopLoss: 87.00, positionSizePercent: 10, riskRewardRatio: 2.8
  },
  {
    quote: { symbol: 'ABUK', nameEn: 'Abu Qir Fertilizers', nameAr: 'أبوقير للأسمدة والصناعات الكيماوية', currentPrice: 73.00, previousClose: 71.30, change: 1.70, changePercent: 2.36, dayHigh: 73.29, dayLow: 70.90, fiftyTwoWeekHigh: 95.00, fiftyTwoWeekLow: 45.18, volume: 2221116, avgVolume: 2138356, peRatio: 8.50 },
    indicators: { rsi: 51.8, sma20: 71.3, sma50: 75.4, support: 70.0, resistance: 80.0, volumeSpike: false, volumeRatio: 1.0 },
    signalType: 'BUY', signalScore: 3.6, reasons: ['عائد صادرات دولار مباشر', 'توزيعات أرباح سخية للمستثمر'], fairValue: 105.00, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 43.84, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
    suggestedEntry: { min: 70.50, max: 73.50 }, suggestedTarget: { target1: 85.00, target2: 105.00 }, suggestedStopLoss: 67.00, positionSizePercent: 8, riskRewardRatio: 2.7
  },
  {
    quote: { symbol: 'TMGH', nameEn: 'Talaat Moustafa Group', nameAr: 'مجموعة طلعت مصطفى القابضة', currentPrice: 97.30, previousClose: 97.60, change: -0.30, changePercent: -0.30, dayHigh: 97.89, dayLow: 95.20, fiftyTwoWeekHigh: 103.87, fiftyTwoWeekLow: 52.25, volume: 3985718, avgVolume: 4220528, peRatio: 13.71 },
    indicators: { rsi: 47.4, sma20: 98.6, sma50: 96.9, support: 94.0, resistance: 104.0, volumeSpike: false, volumeRatio: 0.9 },
    signalType: 'NEUTRAL', signalScore: 3.1, reasons: ['مبيعات تعاقدية ضخمة بمشروع رأس الحكمة', 'تذبذب قصير المدى حول الدعم'], fairValue: 140.00, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 43.88, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
    suggestedEntry: { min: 94.00, max: 97.50 }, suggestedTarget: { target1: 115.00, target2: 140.00 }, suggestedStopLoss: 91.00, positionSizePercent: 7, riskRewardRatio: 2.4
  },
  {
    quote: { symbol: 'JUFO', nameEn: 'Juhayna Food Industries', nameAr: 'جهينة للصناعات الغذائية', currentPrice: 28.67, previousClose: 28.72, change: -0.05, changePercent: -0.17, dayHigh: 28.83, dayLow: 28.48, fiftyTwoWeekHigh: 32.30, fiftyTwoWeekLow: 20.27, volume: 718576, avgVolume: 862228, peRatio: 20.67 },
    indicators: { rsi: 39.7, sma20: 29.7, sma50: 29.6, support: 28.0, resistance: 32.0, volumeSpike: false, volumeRatio: 0.8 },
    signalType: 'NEUTRAL', signalScore: 3.2, reasons: ['استقرار المبيعات المحلية والنمو التصديري', 'اختبار نطاق تجميعي محوري'], fairValue: 41.00, fairValueConfidence: 'MEDIUM', fairValueUpsidePercent: 43.00, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
    suggestedEntry: { min: 28.00, max: 29.00 }, suggestedTarget: { target1: 34.00, target2: 41.00 }, suggestedStopLoss: 26.50, positionSizePercent: 8, riskRewardRatio: 2.5
  },
  {
    quote: { symbol: 'AMOC', nameEn: 'Alexandria Mineral Oils', nameAr: 'الإسكندرية للزيوت المعدنية', currentPrice: 8.91, previousClose: 8.33, change: 0.58, changePercent: 6.96, dayHigh: 9.04, dayLow: 8.33, fiftyTwoWeekHigh: 9.85, fiftyTwoWeekLow: 6.66, volume: 44465398, avgVolume: 7881923, peRatio: 8.12 },
    indicators: { rsi: 70.4, sma20: 8.17, sma50: 8.14, support: 8.20, resistance: 9.85, volumeSpike: true, volumeRatio: 5.6 },
    signalType: 'BUY', signalScore: 4.2, reasons: ['اختراق فني قوي بحجم تداول قياسي', 'ارتفاع هامش تكرير الزيوت'], fairValue: 14.00, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 57.13, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
    suggestedEntry: { min: 8.50, max: 8.95 }, suggestedTarget: { target1: 11.00, target2: 14.00 }, suggestedStopLoss: 8.00, positionSizePercent: 10, riskRewardRatio: 3.2
  },
  {
    quote: { symbol: 'HELI', nameEn: 'Heliopolis Housing', nameAr: 'مصر الجديدة للإسكان والتعمير', currentPrice: 8.20, previousClose: 8.41, change: -0.21, changePercent: -2.50, dayHigh: 8.60, dayLow: 8.19, fiftyTwoWeekHigh: 8.60, fiftyTwoWeekLow: 3.11, volume: 28689142, avgVolume: 23613019, peRatio: 9.10 },
    indicators: { rsi: 68.4, sma20: 7.62, sma50: 6.96, support: 7.80, resistance: 9.00, volumeSpike: true, volumeRatio: 1.2 },
    signalType: 'BUY', signalScore: 3.8, reasons: ['محفظة أراضي شاسعة بشرق القاهرة', 'إعادة تسعير الأصول 부동산'], fairValue: 13.50, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 64.63, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
    suggestedEntry: { min: 7.90, max: 8.30 }, suggestedTarget: { target1: 10.50, target2: 13.50 }, suggestedStopLoss: 7.40, positionSizePercent: 8, riskRewardRatio: 3.0
  },
  {
    quote: { symbol: 'ISPH', nameEn: 'Ibn Sina Pharma', nameAr: 'ابن سينا فارما', currentPrice: 3.85, previousClose: 3.80, change: 0.05, changePercent: 1.32, dayHigh: 3.90, dayLow: 3.75, fiftyTwoWeekHigh: 4.20, fiftyTwoWeekLow: 2.10, volume: 5420100, avgVolume: 4800000, peRatio: 11.20 },
    indicators: { rsi: 60.1, sma20: 3.70, sma50: 3.55, support: 3.65, resistance: 4.10, volumeSpike: true, volumeRatio: 1.3 },
    signalType: 'BUY', signalScore: 3.9, reasons: ['نمو مبيعات توزيع الدواء بمعدل قوي', 'توسع في المراكز اللوجستية الرقمية'], fairValue: 5.80, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 50.65, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
    suggestedEntry: { min: 3.70, max: 3.85 }, suggestedTarget: { target1: 4.60, target2: 5.80 }, suggestedStopLoss: 3.50, positionSizePercent: 8, riskRewardRatio: 2.9
  }
];

export const DEFAULT_GOLD_PRICES: GoldPrices = {
  goldUsdPerOz: 4111.10,
  usdEgpRate: 51.07,
  gold24kEgp: 6828,
  gold21kEgp: 5975,
  gold18kEgp: 5121,
  goldCoinEgp: 47800,
  signalType: 'BUY',
  rsi: 58.4
};
