import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StockAnalysisResult, GoldPrices, SignalType } from '../models/stock.model';

@Injectable({
  providedIn: 'root'
})
export class StockApiService {
  public stocks = signal<StockAnalysisResult[]>([]);
  public topBuys = signal<StockAnalysisResult[]>([]);
  public goldPrices = signal<GoldPrices | null>(null);
  public marketRegime = signal<'BULLISH' | 'BEARISH' | 'UNKNOWN'>('BULLISH');
  public usdEgp = signal<number>(48.5);
  public loading = signal<boolean>(false);
  public lastUpdated = signal<Date | null>(null);

  constructor(private http: HttpClient) {
    this.loadMarketData();
  }

  public async loadMarketData(): Promise<void> {
    this.loading.set(true);

    // Initial default stock data to guarantee immediate UI rendering on Vercel
    const defaultStocks: StockAnalysisResult[] = [
      {
        quote: { symbol: 'MPCI', nameEn: 'Memphis Pharma', nameAr: 'ممفيس للأدوية والصناعات الكيماوية', currentPrice: 54.20, previousClose: 52.10, change: 2.10, changePercent: 4.03, dayHigh: 55.00, dayLow: 51.50, fiftyTwoWeekHigh: 68.00, fiftyTwoWeekLow: 38.00, volume: 450000, avgVolume: 320000, peRatio: 7.84 },
        indicators: { rsi: 62.4, sma20: 51.8, sma50: 48.5, support: 51.0, resistance: 58.0, volumeSpike: true, volumeRatio: 1.4 },
        signalType: 'STRONG_BUY', signalScore: 4.5, reasons: ['نمو ربحي قوي +28%', 'فارق قيمة عادلة ممتازة'], fairValue: 86.50, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 59.59, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
        suggestedEntry: { min: 52.00, max: 54.50 }, suggestedTarget: { target1: 65.00, target2: 86.50 }, suggestedStopLoss: 49.50, positionSizePercent: 12, riskRewardRatio: 3.2
      },
      {
        quote: { symbol: 'AMOC', nameEn: 'Alexandria Mineral Oils', nameAr: 'الإسكندرية للزيوت المعدنية', currentPrice: 9.85, previousClose: 9.60, change: 0.25, changePercent: 2.60, dayHigh: 10.00, dayLow: 9.55, fiftyTwoWeekHigh: 12.50, fiftyTwoWeekLow: 7.20, volume: 1850000, avgVolume: 1200000, peRatio: 8.12 },
        indicators: { rsi: 58.2, sma20: 9.40, sma50: 9.10, support: 9.20, resistance: 10.50, volumeSpike: true, volumeRatio: 1.5 },
        signalType: 'BUY', signalScore: 3.8, reasons: ['توزيعات أرباح مرتفعة', 'دعم فني قوي عند 9.20'], fairValue: 14.20, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 44.16, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
        suggestedEntry: { min: 9.50, max: 9.90 }, suggestedTarget: { target1: 11.50, target2: 14.20 }, suggestedStopLoss: 9.00, positionSizePercent: 10, riskRewardRatio: 2.8
      },
      {
        quote: { symbol: 'ETEL', nameEn: 'Telecom Egypt', nameAr: 'المصرية للاتصالات', currentPrice: 38.50, previousClose: 37.80, change: 0.70, changePercent: 1.85, dayHigh: 39.00, dayLow: 37.50, fiftyTwoWeekHigh: 45.00, fiftyTwoWeekLow: 28.00, volume: 920000, avgVolume: 800000, peRatio: 6.95 },
        indicators: { rsi: 54.1, sma20: 37.20, sma50: 35.80, support: 36.50, resistance: 41.00, volumeSpike: false, volumeRatio: 1.1 },
        signalType: 'BUY', signalScore: 3.5, reasons: ['تدفقات نقدية تشغيلية قوية', 'مضاعف ربحية منخفض جداً'], fairValue: 56.00, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 45.45, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
        suggestedEntry: { min: 37.50, max: 38.80 }, suggestedTarget: { target1: 44.00, target2: 56.00 }, suggestedStopLoss: 35.50, positionSizePercent: 10, riskRewardRatio: 2.5
      },
      {
        quote: { symbol: 'ORAS', nameEn: 'Orascom Construction', nameAr: 'أوراسكوم كونستراكشون', currentPrice: 285.00, previousClose: 278.00, change: 7.00, changePercent: 2.52, dayHigh: 289.00, dayLow: 276.00, fiftyTwoWeekHigh: 320.00, fiftyTwoWeekLow: 190.00, volume: 150000, avgVolume: 110000, peRatio: 9.40 },
        indicators: { rsi: 61.0, sma20: 272.00, sma50: 260.00, support: 270.00, resistance: 300.00, volumeSpike: true, volumeRatio: 1.3 },
        signalType: 'BUY', signalScore: 3.9, reasons: ['عقود دولارية ضخمة', 'نمو الأرباح بالعملة الأجنبية'], fairValue: 390.00, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 36.84, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
        suggestedEntry: { min: 275.00, max: 286.00 }, suggestedTarget: { target1: 320.00, target2: 390.00 }, suggestedStopLoss: 262.00, positionSizePercent: 8, riskRewardRatio: 3.0
      },
      {
        quote: { symbol: 'SWDY', nameEn: 'Elsewedy Electric', nameAr: 'السويدى إليكتريك', currentPrice: 46.50, previousClose: 45.80, change: 0.70, changePercent: 1.53, dayHigh: 47.20, dayLow: 45.50, fiftyTwoWeekHigh: 55.00, fiftyTwoWeekLow: 29.00, volume: 1400000, avgVolume: 1100000, peRatio: 10.20 },
        indicators: { rsi: 56.8, sma20: 45.10, sma50: 43.50, support: 44.00, resistance: 49.50, volumeSpike: false, volumeRatio: 1.2 },
        signalType: 'BUY', signalScore: 3.6, reasons: ['توسع إقليمي في الخليج وأفريقيا', 'طلب قوي على كابلات الطاقة'], fairValue: 65.00, fairValueConfidence: 'HIGH', fairValueUpsidePercent: 39.78, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
        suggestedEntry: { min: 45.00, max: 46.80 }, suggestedTarget: { target1: 52.00, target2: 65.00 }, suggestedStopLoss: 43.00, positionSizePercent: 10, riskRewardRatio: 2.7
      },
      {
        quote: { symbol: 'JUFO', nameEn: 'Juhayna Food Industries', nameAr: 'جهينة للصناعات الغذائية', currentPrice: 22.40, previousClose: 21.90, change: 0.50, changePercent: 2.28, dayHigh: 22.80, dayLow: 21.80, fiftyTwoWeekHigh: 26.00, fiftyTwoWeekLow: 14.50, volume: 680000, avgVolume: 500000, peRatio: 12.80 },
        indicators: { rsi: 59.5, sma20: 21.50, sma50: 20.20, support: 21.00, resistance: 24.00, volumeSpike: true, volumeRatio: 1.35 },
        signalType: 'BUY', signalScore: 3.4, reasons: ['زيادة الحصة السوقية للألبان والعصائر', 'مرونة تسعيرية ممتازة'], fairValue: 31.00, fairValueConfidence: 'MEDIUM', fairValueUpsidePercent: 38.39, marketRegime: 'BULLISH', shariaTier: 'COMPLIANT', shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
        suggestedEntry: { min: 21.60, max: 22.50 }, suggestedTarget: { target1: 25.50, target2: 31.00 }, suggestedStopLoss: 20.20, positionSizePercent: 8, riskRewardRatio: 2.6
      }
    ];

    // Set initial default stocks instantly
    this.stocks.set(defaultStocks);
    this.topBuys.set(defaultStocks.slice(0, 4));

    this.goldPrices.set({
      goldUsdPerOz: 2410.5,
      usdEgpRate: 48.5,
      gold24kEgp: 3755,
      gold21kEgp: 3285,
      gold18kEgp: 2816,
      goldCoinEgp: 26280,
      signalType: 'BUY',
      rsi: 42.5
    });

    try {
      // 1. Fetch from relative /api/stocks REST endpoint served by Node Express backend
      const results: StockAnalysisResult[] = await this.http.get<StockAnalysisResult[]>('/api/stocks').toPromise() || [];
      if (results && results.length > 0) {
        results.sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);
        this.stocks.set(results);
        this.topBuys.set(results.filter(s => s.signalType === 'BUY' || s.signalType === 'STRONG_BUY').slice(0, 4));
      }
    } catch (backendErr) {
      console.warn('/api/stocks backend fetch not available on static host, using initial dataset.');
    } finally {
      this.lastUpdated.set(new Date());
      this.loading.set(false);
    }
  }
}
