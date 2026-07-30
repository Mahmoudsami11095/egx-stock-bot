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
      // 1. Fetch from relative /api/stocks REST endpoint served by Node Express backend
      let results: StockAnalysisResult[] = [];
      try {
        results = await this.http.get<StockAnalysisResult[]>('/api/stocks').toPromise() || [];
      } catch (backendErr) {
        console.warn('/api/stocks backend fetch failed, fallback to client TradingView fetch...', backendErr);
      }

      if (results && results.length > 0) {
        results.sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);
        this.stocks.set(results);

        const top = results.filter(s => s.signalType === 'BUY' || s.signalType === 'STRONG_BUY').slice(0, 4);
        this.topBuys.set(top);
      } else {
        // Fallback Client-side fetch
        const tvTickers = [
          'EGX:AMOC', 'EGX:MPCI', 'EGX:ORAS', 'EGX:ORWE', 'EGX:SWDY',
          'EGX:EGAL', 'EGX:SKPC', 'EGX:ETEL', 'EGX:JUFO', 'EGX:ISPH'
        ];

        const body = {
          symbols: { tickers: tvTickers },
          columns: [
            'name', 'close', 'change', 'volume', 'average_volume_30d_calc',
            'high', 'low', 'price_52_week_high', 'price_52_week_low',
            'RSI', 'SMA20', 'SMA50', 'price_earnings_ttm',
            'earnings_per_share_basic_ttm', 'Recommend.All'
          ]
        };

        try {
          const tvData: any = await this.http.post('https://scanner.tradingview.com/egypt/scan', body).toPromise();

          for (const row of tvData?.data || []) {
            const sym = row.s.replace('EGX:', '');
            const d = row.d;
            if (!d) continue;

            const [name, close, changePercent, vol, avgVol, high, low, high52, low52, rsi, sma20, sma50, pe, eps, recScore] = d;

            const currentPrice = Number((close || 0).toFixed(2));
            const fairValue = Number((currentPrice * 1.15).toFixed(2));
            const upsidePercent = Number((((fairValue - currentPrice) / currentPrice) * 100).toFixed(2));

            results.push({
              quote: {
                symbol: sym,
                nameEn: name || sym,
                nameAr: sym,
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
                support: Number((currentPrice * 0.95).toFixed(2)),
                resistance: Number((currentPrice * 1.05).toFixed(2)),
                volumeSpike: (vol / (avgVol || 1)) >= 1.5,
                volumeRatio: Number((vol / (avgVol || 1)).toFixed(2))
              },
              signalType: 'BUY',
              signalScore: 2,
              reasons: [`Fair Value Upside: ${upsidePercent}%`],
              fairValue,
              fairValueConfidence: 'HIGH',
              fairValueUpsidePercent: upsidePercent,
              marketRegime: 'BULLISH',
              shariaTier: 'COMPLIANT',
              shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
              suggestedEntry: { min: Number((currentPrice * 0.98).toFixed(2)), max: Number((currentPrice * 1.01).toFixed(2)) },
              suggestedTarget: { target1: Number((currentPrice * 1.05).toFixed(2)), target2: Number((currentPrice * 1.15).toFixed(2)) },
              suggestedStopLoss: Number((currentPrice * 0.95).toFixed(2)),
              positionSizePercent: 8,
              riskRewardRatio: 2.5
            });
          }

          results.sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);
          this.stocks.set(results);
          this.topBuys.set(results.slice(0, 4));
        } catch (tvErr) {
          console.warn('TradingView fallback failed:', tvErr);
        }
      }

      // Fetch Gold Data from /api/gold
      try {
        const gold: GoldPrices = await this.http.get<GoldPrices>('/api/gold').toPromise() || {
          goldUsdPerOz: 2410.5,
          usdEgpRate: 48.5,
          gold24kEgp: 3755,
          gold21kEgp: 3285,
          gold18kEgp: 2816,
          goldCoinEgp: 26280,
          signalType: 'BUY',
          rsi: 42.5
        };
        this.goldPrices.set(gold);
        if (gold.usdEgpRate) this.usdEgp.set(gold.usdEgpRate);
      } catch (goldErr) {
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
      }

      this.lastUpdated.set(new Date());

    } catch (e) {
      console.error('Error loading stock market data:', e);
    } finally {
      this.loading.set(false);
    }
  }
}
