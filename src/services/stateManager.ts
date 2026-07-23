import fs from 'fs';
import path from 'path';
import { StockMeta, INITIAL_STOCKS } from '../constants/stocks';
import { AlertState, SignalType } from '../types/stock';
import { logger } from './logger';

export class StateManager {
  private watchlistFile: string;
  private watchlist: StockMeta[] = [];
  private alertStates: Map<string, AlertState> = new Map();
  private cooldownMs = 2 * 60 * 60 * 1000; // 2 hours cool-down for duplicate alerts

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.watchlistFile = path.join(dataDir, 'watchlist.json');
    this.loadWatchlist();
  }

  private loadWatchlist(): void {
    if (fs.existsSync(this.watchlistFile)) {
      try {
        const raw = fs.readFileSync(this.watchlistFile, 'utf-8');
        this.watchlist = JSON.parse(raw);
        logger.info(`Loaded ${this.watchlist.length} stocks from watchlist.json`);
        return;
      } catch (err) {
        logger.error(`Error reading watchlist.json, loading defaults: ${err}`);
      }
    }

    this.watchlist = [...INITIAL_STOCKS];
    this.saveWatchlist();
  }

  public saveWatchlist(): void {
    try {
      fs.writeFileSync(this.watchlistFile, JSON.stringify(this.watchlist, null, 2), 'utf-8');
    } catch (err) {
      logger.error(`Failed to save watchlist.json: ${err}`);
    }
  }

  public getWatchlist(): StockMeta[] {
    return this.watchlist;
  }

  public addStock(stock: StockMeta): boolean {
    const exists = this.watchlist.some((s) => s.symbol.toUpperCase() === stock.symbol.toUpperCase());
    if (exists) return false;

    this.watchlist.push(stock);
    this.saveWatchlist();
    return true;
  }

  public removeStock(symbol: string): boolean {
    const initialLen = this.watchlist.length;
    this.watchlist = this.watchlist.filter((s) => s.symbol.toUpperCase() !== symbol.toUpperCase());
    if (this.watchlist.length !== initialLen) {
      this.saveWatchlist();
      return true;
    }
    return false;
  }

  public findStock(symbol: string): StockMeta | undefined {
    return this.watchlist.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
  }

  /**
   * Checks if an alert should be sent based on previous state and cool-down window.
   */
  public shouldSendAlert(symbol: string, currentSignal: SignalType, currentPrice: number): boolean {
    if (currentSignal === 'NEUTRAL') return false;

    const state = this.alertStates.get(symbol);
    const now = Date.now();

    if (!state) {
      // First time alert
      this.alertStates.set(symbol, {
        lastSignalType: currentSignal,
        lastAlertTime: now,
        lastPrice: currentPrice,
      });
      return true;
    }

    // Send alert if signal type changed (e.g., BUY -> STRONG_BUY or BUY -> SELL)
    if (state.lastSignalType !== currentSignal) {
      this.alertStates.set(symbol, {
        lastSignalType: currentSignal,
        lastAlertTime: now,
        lastPrice: currentPrice,
      });
      return true;
    }

    // If same signal, only resend if cool-down period has elapsed
    if (now - state.lastAlertTime > this.cooldownMs) {
      this.alertStates.set(symbol, {
        lastSignalType: currentSignal,
        lastAlertTime: now,
        lastPrice: currentPrice,
      });
      return true;
    }

    return false;
  }
}
