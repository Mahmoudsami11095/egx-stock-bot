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

    try {
      // 1. Fetch live TradingView Scan Data directly for 23 Core Halal EGX Stocks
      const tvTickers = [
        'EGX:AMOC', 'EGX:MPCI', 'EGX:ORAS', 'EGX:ORWE', 'EGX:SWDY',
        'EGX:EGAL', 'EGX:SKPC', 'EGX:ETEL', 'EGX:JUFO', 'EGX:ISPH',
        'EGX:EFID', 'EGX:RMDA', 'EGX:CAED', 'EGX:ARVA', 'EGX:APSW',
        'EGX:ARAB', 'EGX:AREH', 'EGX:BIOC', 'EGX:ACRO', 'EGX:AIFI',
        'EGX:ALUM', 'EGX:AJWA', 'EGX:HBCO'
      ];

      const body = {
        symbols: { tickers: tvTickers },
        columns: [
          'name', 'close', 'change', 'volume', 'average_volume_30d_calc',
          'high', 'low', 'price_52_week_high', 'price_52_week_low',
          'RSI', 'SMA20', 'SMA50', 'price_earnings_ttm',
          'earnings_per_share_basic_ttm', 'Recommend.All',
          'MACD.macd', 'MACD.signal', 'ADX', 'ATR'
        ]
      };

      const tvData: any = await this.http.post('https://scanner.tradingview.com/egypt/scan', body).toPromise();

      const results: StockAnalysisResult[] = [];

      const sectorPEs: Record<string, number> = {
        'AMOC': 10, 'MPCI': 18, 'ORAS': 12, 'ORWE': 13, 'SWDY': 12,
        'EGAL': 9, 'SKPC': 10, 'ETEL': 14, 'JUFO': 16, 'ISPH': 18,
        'EFID': 16, 'RMDA': 18, 'BIOC': 18, 'ACRO': 12
      };

      const arabicNames: Record<string, string> = {
        'AMOC': 'الإسكندرية للزيوت المعدنية',
        'MPCI': 'ممفيس للأدوية والصناعات الكيماوية',
        'ORAS': 'أوراسكوم كونستراكشون',
        'ORWE': 'النساجون الشرقيون للسجاد',
        'SWDY': 'السويدى إليكتريك',
        'EGAL': 'مصر للألومنيوم',
        'SKPC': 'سيدى كرير للبتروكيماويات',
        'ETEL': 'المصرية للاتصالات',
        'JUFO': 'جهينة للصناعات الغذائية',
        'ISPH': 'ابن سينا فارما',
        'EFID': 'ايديتا للصناعات الغذائية',
        'RMDA': 'العاشر من رمضان - راميدا',
        'CAED': 'القاهرة للخدمات التعليمية',
        'ARVA': 'العربية للمحابس',
        'APSW': 'العربية وبولفارا للغزل والنسيج',
        'ARAB': 'المطورون العرب القابضة',
        'AREH': 'المجموعة المصرية العقارية',
        'BIOC': 'جلاكسو سميثكلاين',
        'ACRO': 'أكرو مصر للشدات والسقالات',
        'AIFI': 'أطلس للاستثمار',
        'ALUM': 'الألومنيوم العربية',
        'AJWA': 'أجواء للصناعات الغذائية',
        'HBCO': 'هيبكو للاستثمارات'
      };

      for (const row of tvData?.data || []) {
        const sym = row.s.replace('EGX:', '');
        const d = row.d;
        if (!d) continue;

        const [name, close, changePercent, vol, avgVol, high, low, high52, low52, rsi, sma20, sma50, pe, eps, recScore, macdVal, macdSig, adxVal, atrVal] = d;

        const currentPrice = Number((close || 0).toFixed(2));
        const peMult = sectorPEs[sym] || 13.5;

        let fairValue = currentPrice;
        let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
        if (eps && eps > 0) {
          fairValue = eps * peMult * (1 + (recScore || 0) * 0.08);
          confidence = 'HIGH';
        } else {
          const midpoint = (low52 || currentPrice * 0.7) + 0.618 * ((high52 || currentPrice * 1.3) - (low52 || currentPrice * 0.7));
          fairValue = midpoint * (1 + (recScore || 0) * 0.1);
          confidence = 'LOW';
        }

        fairValue = Math.max(currentPrice * 0.85, Math.min(currentPrice * 1.5, fairValue));
        fairValue = Number(fairValue.toFixed(2));

        const upsidePercent = Number((((fairValue - currentPrice) / currentPrice) * 100).toFixed(2));

        // Signal Calculation
        let score = 0;
        if (upsidePercent >= 20) score += 2;
        else if (upsidePercent >= 10) score += 1;
        else if (upsidePercent <= -10) score -= 1;

        if (rsi < 35) score += 2;
        else if (rsi < 45) score += 1;
        else if (rsi > 70) score -= 2;

        if (sma20 > sma50) score += 1;
        else if (sma20 < sma50) score -= 1;

        if (macdVal > macdSig) score += 1;
        else if (macdVal < macdSig) score -= 1;

        let signalType: SignalType = 'NEUTRAL';
        if (score >= 3) signalType = 'STRONG_BUY';
        else if (score >= 1) signalType = 'BUY';
        else if (score <= -3) signalType = 'STRONG_SELL';
        else if (score <= -1) signalType = 'SELL';

        const atr = atrVal ? Number(atrVal.toFixed(2)) : currentPrice * 0.02;
        const entryMin = Number((currentPrice - 0.5 * atr).toFixed(2));
        const entryMax = Number((currentPrice + 0.5 * atr).toFixed(2));
        const target1 = Number((currentPrice + 2.0 * atr).toFixed(2));
        const target2 = Number(Math.max(currentPrice + 3.0 * atr, fairValue).toFixed(2));
        const stopLoss = Number((currentPrice - 1.5 * atr).toFixed(2));

        const riskPerShare = Math.max(0.01, currentPrice - stopLoss);
        const positionSizePercent = Number(Math.min(15, Math.max(2, Number((2 / (riskPerShare / currentPrice)).toFixed(1)))).toFixed(1));
        const riskRewardRatio = Number(Math.max(0, (target1 - currentPrice) / riskPerShare).toFixed(2));

        results.push({
          quote: {
            symbol: sym,
            nameEn: name || sym,
            nameAr: arabicNames[sym] || sym,
            currentPrice,
            previousClose: currentPrice,
            change: Number((currentPrice * (changePercent || 0) / 100).toFixed(2)),
            changePercent: Number((changePercent || 0).toFixed(2)),
            dayHigh: high || currentPrice,
            dayLow: low || currentPrice,
            fiftyTwoWeekHigh: high52 || currentPrice,
            fiftyTwoWeekLow: low52 || currentPrice,
            volume: vol || 0,
            avgVolume: avgVol || 0,
            peRatio: pe ? Number(pe.toFixed(2)) : undefined
          },
          indicators: {
            rsi: rsi ? Number(rsi.toFixed(2)) : 50,
            sma20: sma20 ? Number(sma20.toFixed(2)) : currentPrice,
            sma50: sma50 ? Number(sma50.toFixed(2)) : currentPrice,
            macd: { macd: macdVal, signal: macdSig },
            adx: adxVal ? Number(adxVal.toFixed(2)) : 20,
            atr,
            support: Number((currentPrice * 0.95).toFixed(2)),
            resistance: Number((currentPrice * 1.05).toFixed(2)),
            volumeSpike: (vol / (avgVol || 1)) >= 1.5,
            volumeRatio: Number((vol / (avgVol || 1)).toFixed(2))
          },
          signalType,
          signalScore: score,
          reasons: [
            `القيمة العادلة المحسوبة: ${fairValue} ج.م (نسبة نمو متوقعة ${upsidePercent}%)`,
            `مؤشر RSI(14): ${rsi ? rsi.toFixed(1) : '50'}`,
            `تقاطع المتوسطات: SMA20 (${sma20?.toFixed(1)}) / SMA50 (${sma50?.toFixed(1)})`
          ],
          fairValue,
          fairValueConfidence: confidence,
          fairValueUpsidePercent: upsidePercent,
          marketRegime: 'BULLISH',
          shariaTier: 'COMPLIANT',
          shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
          suggestedEntry: { min: entryMin, max: entryMax },
          suggestedTarget: { target1, target2 },
          suggestedStopLoss: stopLoss,
          positionSizePercent,
          riskRewardRatio
        });
      }

      // Sort descending by Fair Value Upside %
      results.sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);
      this.stocks.set(results);

      const top = results.filter(s => s.signalType === 'BUY' || s.signalType === 'STRONG_BUY').slice(0, 4);
      this.topBuys.set(top);

      // Gold & Forex calculation
      const usdRate = 48.5;
      const goldUsd = 2410.5;
      const gold24k = Number(((goldUsd / 31.1035) * usdRate).toFixed(2));
      const gold21k = Number((gold24k * 0.875).toFixed(2));
      const gold18k = Number((gold24k * 0.750).toFixed(2));
      const goldCoin = Number((gold21k * 8).toFixed(2));

      this.goldPrices.set({
        goldUsdPerOz: goldUsd,
        usdEgpRate: usdRate,
        gold24kEgp: gold24k,
        gold21kEgp: gold21k,
        gold18kEgp: gold18k,
        goldCoinEgp: goldCoin,
        signalType: 'BUY',
        rsi: 42.5
      });

      this.lastUpdated.set(new Date());

    } catch (e) {
      console.error('Error loading stock market data:', e);
    } finally {
      this.loading.set(false);
    }
  }
}
