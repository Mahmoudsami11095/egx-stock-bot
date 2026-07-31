import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { StockAnalysisResult, GoldPrices } from '../models/stock.model';
import { DEFAULT_STOCKS, DEFAULT_GOLD_PRICES } from '../constants/default-stocks';

const STORAGE_KEY = 'egx_stocks_cache_v1';
const STORAGE_TIME_KEY = 'egx_stocks_cache_timestamp';

@Injectable({
  providedIn: 'root'
})
export class StockApiService {
  public stocks = signal<StockAnalysisResult[]>([]);
  public topBuys = signal<StockAnalysisResult[]>([]);
  public goldPrices = signal<GoldPrices | null>(DEFAULT_GOLD_PRICES);
  public marketRegime = signal<'BULLISH' | 'BEARISH' | 'UNKNOWN'>('BULLISH');
  public usdEgp = signal<number>(51.07);
  public loading = signal<boolean>(false);
  public lastUpdated = signal<Date | null>(null);
  public isUsingCache = signal<boolean>(false);

  constructor(private http: HttpClient) {
    this.initFromCache();
    this.loadMarketData();
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
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read stocks from localStorage cache', e);
    }

    // Baseline fallback if no cache is present on first launch
    this.applyStockData(DEFAULT_STOCKS, false);
  }

  private applyStockData(data: StockAnalysisResult[], fromCache: boolean): void {
    const isHalalOnly = (s: StockAnalysisResult) => s.shariaTier !== 'NON_COMPLIANT';
    const isBuySignal = (s: StockAnalysisResult) => s.signalType === 'BUY' || s.signalType === 'STRONG_BUY';

    const sortedData = [...data].sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);
    this.stocks.set(sortedData);
    this.topBuys.set(sortedData.filter(s => isHalalOnly(s) && isBuySignal(s)).slice(0, 4));
    this.isUsingCache.set(fromCache);
  }

  public async loadMarketData(): Promise<void> {
    this.loading.set(true);

    try {
      const results: StockAnalysisResult[] = await this.http.get<StockAnalysisResult[]>('/api/stocks').toPromise() || [];
      if (results && results.length > 0) {
        this.applyStockData(results, false);
        const now = new Date();
        this.lastUpdated.set(now);

        // Save fresh live data to client localStorage for instant load next visit & offline resiliency
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
          localStorage.setItem(STORAGE_TIME_KEY, now.getTime().toString());
        } catch (storageErr) {
          console.warn('Could not persist stocks into localStorage cache', storageErr);
        }
      }
    } catch (backendErr) {
      console.warn('/api/stocks fetch unavailable, serving cached dataset.', backendErr);
      if (this.stocks().length === 0) {
        this.applyStockData(DEFAULT_STOCKS, true);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
