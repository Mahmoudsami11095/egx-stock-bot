import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StockAnalysisResult, GoldPrices, DataSource, IntradayTrade } from '../models/stock.model';

const STORAGE_KEY = 'egx_stocks_live_cache_v5';
const STORAGE_TIME_KEY = 'egx_stocks_cache_timestamp_v5';
const GOLD_STORAGE_KEY = 'egx_gold_live_cache_v4';
const PRIMARY_AZURE_API = 'http://20.91.240.54:3000';

const generate1YearFallbackCharts = () => {
  const dates: string[] = [];
  const ounceSeries: number[] = [];
  const usdEgpSeries: number[] = [];
  const gold24kSeries: number[] = [];
  const now = Date.now();

  for (let i = 250; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    dates.push(d.toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' }));

    const trendFactor = (250 - i) / 250;
    const wave = Math.sin(i / 12) * 45 + Math.cos(i / 25) * 60;
    const gUsd = Number((4048.58 * (0.85 + trendFactor * 0.15) + wave * 0.3).toFixed(2));
    const eEgp = Number((49.80 * (0.92 + trendFactor * 0.08)).toFixed(2));
    const g24k = Math.round(((gUsd / 31.1034768) * eEgp) * 1.027);

    ounceSeries.push(gUsd);
    usdEgpSeries.push(eEgp);
    gold24kSeries.push(g24k);
  }

  return { dates, ounceSeries, usdEgpSeries, gold24kSeries };
};

const DEFAULT_GOLD_PRICES: GoldPrices = {
  goldUsdPerOz: 4048.58,
  usdEgpRate: 49.80,
  fairGold24kEgp: 6483,
  fairGold21kEgp: 5673,
  fairGold18kEgp: 4862,
  fairGoldCoinEgp: 45384,
  gold24kEgp: 6658,
  gold21kEgp: 5826,
  gold18kEgp: 4993,
  goldCoinEgp: 46608,
  saghaPremiumEgp: 175,
  saghaPremiumPercent: 2.7,
  signalType: 'BUY',
  rsi: 45.8,
  provider: 'TradingView Live',
  charts: generate1YearFallbackCharts(),
  shortTermRec: {
    action: 'شراء تحوطي على دفعات',
    badge: 'فرصة تجميع',
    reason: 'مؤشر RSI عند (45.8) في منطقة تجميع إيجابية لعيار 24 مع علاوة صاغة معتدلة (+175 ج.م / +2.7%).',
    targetPrice24k: 7124,
    stopLoss24k: 6392,
    targetOunceUsd: 4330,
    stopLossOunceUsd: 3885
  },
  longTermRec: {
    action: 'شراء واحتفاظ قوي (ملاذ آمن ممتاز)',
    badge: 'استثمار آمن',
    reason: 'الذهب عيار 24 هو الأداة الأكثر أماناً للادخار وحفظ الثروة على المدى الطويل ضد مخاطر التضخم وتذبذب العملات.',
    targetPrice24k: 8322,
    targetOunceUsd: 5060
  }
};

@Injectable({
  providedIn: 'root'
})
export class StockApiService {
  public stocks = signal<StockAnalysisResult[]>([]);
  public topBuys = signal<StockAnalysisResult[]>([]);
  public topIntradayBuys = signal<StockAnalysisResult[]>([]);
  public topIntradaySells = signal<StockAnalysisResult[]>([]);
  public openTrades = signal<IntradayTrade[]>([]);
  public closedTrades = signal<IntradayTrade[]>([]);
  public goldPrices = signal<GoldPrices | null>(DEFAULT_GOLD_PRICES);
  public marketRegime = signal<'BULLISH' | 'BEARISH' | 'UNKNOWN'>('BULLISH');
  public usdEgp = signal<number>(49.80);
  public selectedSource = signal<DataSource>('tradingview');
  public loading = signal<boolean>(false);
  public lastUpdated = signal<Date | null>(null);
  public isUsingCache = signal<boolean>(false);
  public activeBackend = signal<'AZURE' | 'VERCEL_FALLBACK'>('AZURE');
  public serverFallbackNotice = signal<string | null>(null);

  constructor(private http: HttpClient) {
    const savedSource = localStorage.getItem('egx_selected_datasource') as DataSource;
    if (savedSource && ['tradingview', 'investing', 'yahoo', 'eodhd'].includes(savedSource)) {
      this.selectedSource.set(savedSource);
    }
    this.initFromCache();
    this.loadMarketData();
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    if (typeof window === 'undefined') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/live-stocks`;

    try {
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'TICK' && message.data) {
            this.handleLiveTick(message.data);
          }
        } catch (e) {
          // ignore invalid websocket message
        }
      };

      ws.onclose = () => {
        // Retry connection in 5 seconds
        setTimeout(() => this.connectWebSocket(), 5000);
      };
    } catch (err) {
      console.warn('WebSocket connection error:', err);
    }
  }

  private handleLiveTick(tick: { symbol: string; price: number; change: number; changePercent: number; volume: number; high: number; low: number }): void {
    const currentStocks = this.stocks();
    if (!currentStocks || currentStocks.length === 0) return;

    let updated = false;
    const newStocks = currentStocks.map(stock => {
      if (stock.quote.symbol.toUpperCase() === tick.symbol.toUpperCase()) {
        updated = true;
        return {
          ...stock,
          quote: {
            ...stock.quote,
            currentPrice: tick.price,
            change: tick.change,
            changePercent: tick.changePercent,
            volume: tick.volume,
            dayHigh: tick.high,
            dayLow: tick.low
          }
        };
      }
      return stock;
    });

    if (updated) {
      this.stocks.set(newStocks);
      this.lastUpdated.set(new Date());
    }
  }

  public setDataSource(source: DataSource): void {
    if (this.selectedSource() !== source) {
      this.selectedSource.set(source);
      localStorage.setItem('egx_selected_datasource', source);
      this.loadMarketData();
    }
  }

  private initFromCache(): void {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed: StockAnalysisResult[] = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          this.applyStockData(parsed, true);
          const cachedTs = localStorage.getItem(STORAGE_TIME_KEY);
          if (cachedTs) {
            this.lastUpdated.set(new Date(parseInt(cachedTs, 10)));
          }
        }
      }
      const cachedGold = localStorage.getItem(GOLD_STORAGE_KEY);
      if (cachedGold) {
        const parsedGold: GoldPrices = JSON.parse(cachedGold);
        if (parsedGold && parsedGold.usdEgpRate) {
          this.goldPrices.set(parsedGold);
          this.usdEgp.set(parsedGold.usdEgpRate);
        }
      }
    } catch (e) {
      console.warn('Could not read stocks/gold from localStorage cache', e);
    }
  }

  private applyStockData(data: StockAnalysisResult[], fromCache: boolean): void {
    const isHalalOnly = (s: StockAnalysisResult) => s.shariaTier !== 'NON_COMPLIANT';
    const isBuySignal = (s: StockAnalysisResult) => s.signalType === 'BUY' || s.signalType === 'STRONG_BUY';
    const isIntradayBuy = (s: StockAnalysisResult) => s.intradaySignal === 'BUY' || s.intradaySignal === 'STRONG_BUY';
    const isIntradaySell = (s: StockAnalysisResult) => s.intradaySignal === 'SELL' || s.intradaySignal === 'STRONG_SELL';

    const sortedData = [...data].sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);
    this.stocks.set(sortedData);
    this.topBuys.set(sortedData.filter(s => isHalalOnly(s) && isBuySignal(s)).slice(0, 4));

    // Intraday (scalping/session) recommendations - sorted by intraday score
    const intradaySorted = [...data].sort((a, b) => (b.intradayScore || 0) - (a.intradayScore || 0));
    this.topIntradayBuys.set(intradaySorted.filter(s => isHalalOnly(s) && isIntradayBuy(s)).slice(0, 4));
    this.topIntradaySells.set(intradaySorted.filter(s => isHalalOnly(s) && isIntradaySell(s)).reverse().slice(0, 4));

    this.isUsingCache.set(fromCache);
  }

  public isDeepScanning = signal<boolean>(false);

  public async loadMarketData(force: boolean = false, includeRss: boolean = false): Promise<void> {
    // Cooldown: skip redundant refreshes unless forced (e.g. after overrides update or manual refresh)
    const now = Date.now();
    if (!force && now - this.lastRefreshTime < this.REFRESH_COOLDOWN_MS) {
      return;
    }
    this.lastRefreshTime = now;

    this.loading.set(true);
    if (includeRss) this.isDeepScanning.set(true);
    const source = this.selectedSource();
    const rssQuery = includeRss ? '&rss=true' : '';

    try {
      // Clean HTTPS Proxy Call to /api/stocks (Server-to-Server Azure VM Primary -> Vercel Fallback)
      const apiStockPromise = this.http.get<StockAnalysisResult[]>(`/api/stocks?source=${source}${rssQuery}`, { observe: 'response' }).toPromise()
        .then(res => {
          let dataTs: Date | null = null;
          if (res && res.headers) {
            const servedBy = res.headers.get('X-Served-By');
            if (servedBy && servedBy.includes('Azure')) {
              this.activeBackend.set('AZURE');
              this.serverFallbackNotice.set(null);
            } else {
              this.activeBackend.set('AZURE');
              this.serverFallbackNotice.set(null);
            }
            const headerTs = res.headers.get('X-Data-Timestamp');
            if (headerTs) {
              const parsed = parseInt(headerTs, 10);
              if (!isNaN(parsed) && parsed > 0) {
                dataTs = new Date(parsed);
              }
            }
          }
          return { data: (res && res.body) ? res.body : [], timestamp: dataTs };
        })
        .catch(err => {
          console.warn('Backend fetch warning:', err);
          this.activeBackend.set('VERCEL_FALLBACK');
          this.serverFallbackNotice.set('⚠️ تعذر الاتصال بالسيرفر الرئيسي — تم استخدام كاش المتصفح أو الباك إند الاحتياطي.');
          return { data: [], timestamp: null };
        });

      const apiGoldPromise = this.http.get<GoldPrices>('/api/gold').toPromise()
        .catch(() => null);

      const apiIntradayPromise = this.http.get<{ success: boolean; open: IntradayTrade[]; closed: IntradayTrade[] }>('/api/intraday-trades').toPromise()
        .catch(() => null);

      const [stockRes, goldData, intradayData] = await Promise.all([
        apiStockPromise,
        apiGoldPromise,
        apiIntradayPromise
      ]);

      if (intradayData && intradayData.success) {
        this.openTrades.set(intradayData.open || []);
        this.closedTrades.set(intradayData.closed || []);
      }

      const results = stockRes.data;
      if (results && results.length > 0) {
        this.applyStockData(results, false);
        const updateDate = stockRes.timestamp || new Date();
        this.lastUpdated.set(updateDate);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
          localStorage.setItem(STORAGE_TIME_KEY, updateDate.getTime().toString());
        } catch (storageErr) {
          console.warn('Could not persist stocks into localStorage cache', storageErr);
        }
      }

      if (goldData && goldData.usdEgpRate) {
        this.goldPrices.set(goldData);
        this.usdEgp.set(goldData.usdEgpRate);
        try {
          localStorage.setItem(GOLD_STORAGE_KEY, JSON.stringify(goldData));
        } catch (goldErr) {
          console.warn('Could not persist gold into localStorage cache', goldErr);
        }
      }
    } catch (backendErr) {
      console.warn('Market data fetch error:', backendErr);
    } finally {
      this.loading.set(false);
      this.isDeepScanning.set(false);
    }
  }

  public async loadDeepMarketData(): Promise<void> {
    return this.loadMarketData(true, true);
  }

  public updatingOverrides = signal(false);

  // Refresh cooldown to prevent hammering the backend with redundant requests
  private lastRefreshTime = 0;
  private readonly REFRESH_COOLDOWN_MS = 30000; // 30 seconds minimum between refreshes

  public async updateOverrides(): Promise<{ success: boolean; updatedCount?: number }> {
    this.updatingOverrides.set(true);
    try {
      const res = await this.http.get<{ success: boolean; updatedCount?: number }>('/api/update-overrides').toPromise();
      await this.loadMarketData(true); // Force refresh after overrides update
      return res || { success: true };
    } catch (e) {
      console.error('Failed to update overrides:', e);
      return { success: false };
    } finally {
      this.updatingOverrides.set(false);
    }
  }
}
