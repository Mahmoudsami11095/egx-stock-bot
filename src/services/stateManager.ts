import fs from 'fs';
import path from 'path';
import { StockMeta, INITIAL_STOCKS } from '../constants/stocks';
import { AlertState, SignalType } from '../types/stock';
import { logger } from './logger';

export class StateManager {
  private watchlistFile: string;
  private subscribersFile: string;
  private watchlist: StockMeta[] = [];
  private subscribers: Set<string> = new Set();
  private alertStates: Map<string, AlertState> = new Map();
  private cooldownMs = 2 * 60 * 60 * 1000; // 2 hour cooldown per stock signal

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    this.watchlistFile = path.join(dataDir, 'watchlist.json');
    this.subscribersFile = path.join(dataDir, 'subscribers.json');
    this.loadData();
  }

  private loadData(): void {
    if (fs.existsSync(this.watchlistFile)) {
      try {
        const raw = fs.readFileSync(this.watchlistFile, 'utf-8');
        this.watchlist = JSON.parse(raw);
      } catch (err) {
        logger.error(`Error loading watchlist.json: ${err}`);
        this.watchlist = [...INITIAL_STOCKS];
      }
    } else {
      this.watchlist = [...INITIAL_STOCKS];
      this.saveWatchlist();
    }

    if (fs.existsSync(this.subscribersFile)) {
      try {
        const raw = fs.readFileSync(this.subscribersFile, 'utf-8');
        const list: string[] = JSON.parse(raw);
        this.subscribers = new Set(list);
      } catch (err) {
        logger.error(`Error loading subscribers.json: ${err}`);
      }
    }
  }

  public saveWatchlist(): void {
    try {
      fs.writeFileSync(this.watchlistFile, JSON.stringify(this.watchlist, null, 2), 'utf-8');
    } catch (err) {
      logger.error(`Failed to save watchlist.json: ${err}`);
    }
  }

  public saveSubscribers(): void {
    try {
      fs.writeFileSync(this.subscribersFile, JSON.stringify(Array.from(this.subscribers), null, 2), 'utf-8');
    } catch (err) {
      logger.error(`Failed to save subscribers.json: ${err}`);
    }
  }

  public addSubscriber(chatId: string): boolean {
    if (!this.subscribers.has(chatId)) {
      this.subscribers.add(chatId);
      this.saveSubscribers();
      return true;
    }
    return false;
  }

  public getSubscribers(): string[] {
    return Array.from(this.subscribers);
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

  public shouldSendAlert(symbol: string, currentSignal: SignalType, currentPrice: number): boolean {
    if (currentSignal === 'NEUTRAL') return false;
    const state = this.alertStates.get(symbol);
    const now = Date.now();

    if (!state) {
      this.alertStates.set(symbol, { lastSignalType: currentSignal, lastAlertTime: now, lastPrice: currentPrice });
      return true;
    }

    if (state.lastSignalType !== currentSignal) {
      this.alertStates.set(symbol, { lastSignalType: currentSignal, lastAlertTime: now, lastPrice: currentPrice });
      return true;
    }

    if (now - state.lastAlertTime > this.cooldownMs) {
      this.alertStates.set(symbol, { lastSignalType: currentSignal, lastAlertTime: now, lastPrice: currentPrice });
      return true;
    }

    return false;
  }
}
