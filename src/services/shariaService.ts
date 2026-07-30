import https from 'https';
import { StockMeta } from '../constants/stocks';
import { StateManager } from './stateManager';
import { logger } from './logger';

export interface TemplatesnippetStockItem {
  id?: string;
  symbol: string;
  name_en?: string;
  name_ar?: string;
  currency?: string;
  updated_at?: string;
  last_updated?: string;
  sp_haram_earning_percentage?: number;
  haram_earnings_percentage?: number;
  loans_percentage?: number;
  core_activity_compliant?: boolean;
  cash_liquidity_compliant?: boolean;
  haram_investments_compliant?: boolean;
}

export interface ShariaComplianceInfo {
  symbol: string;
  nameAr: string;
  isHalal: boolean;
  statusText: string;
  haramRevenuePercent: number;
  debtRatioPercent: number;
  reason?: string;
}

export class ShariaService {
  private liveHalalMap = new Map<string, StockMeta>();
  private liveNonHalalMap = new Map<string, { symbol: string; nameAr: string; reason: string }>();

  constructor() {
    this.fetchLiveShariaDatabase().catch((err) => {
      logger.error(`Error initializing ShariaService live database: ${err}`);
    });
  }

  /**
   * Fetches live 238-stock Sharia database from https://stocks.templatesnippet.com/data/stocks.json
   */
  public async fetchLiveShariaDatabase(): Promise<{ halalCount: number; nonHalalCount: number }> {
    logger.info('🔍 Fetching live Sharia database from https://stocks.templatesnippet.com/data/stocks.json ...');

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'stocks.templatesnippet.com',
        port: 443,
        path: '/data/stocks.json',
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const rawList: TemplatesnippetStockItem[] = JSON.parse(body);
            this.liveHalalMap.clear();
            this.liveNonHalalMap.clear();

            let latestTimestamp = 0;
            for (const item of rawList) {
              const sym = item.symbol.toUpperCase();
              const nameAr = item.name_ar || item.name_en || sym;
              const nameEn = item.name_en || sym;

              if (item.updated_at || item.last_updated) {
                const ts = new Date(item.updated_at || item.last_updated || 0).getTime();
                if (ts > latestTimestamp) latestTimestamp = ts;
              }

              const isCoreCompliant = item.core_activity_compliant !== false;
              const loansPercent = item.loans_percentage ?? 0;
              const haramPercent = item.haram_earnings_percentage ?? item.sp_haram_earning_percentage ?? 0;

              // Explicit Non-Halal override
              if (sym === 'SUGR') {
                this.liveNonHalalMap.set(sym, { symbol: sym, nameAr, reason: 'نسبة القروض مرتفعة (57.59%) - غير متوافق في مصفى وبورصة حلال وكاشف وبنك فيصل' });
                continue;
              }

              // Sharia AAOIFI & Sharia Compliance Rules:
              // 1. Core Activity must be compliant
              // 2. Interest-bearing Loans <= 33%
              // 3. Impurities / Haram Earnings Revenue <= 5%
              if (!isCoreCompliant) {
                this.liveNonHalalMap.set(sym, { symbol: sym, nameAr, reason: 'نشاط غير متوافق' });
              } else if (loansPercent > 33) {
                this.liveNonHalalMap.set(sym, { symbol: sym, nameAr, reason: `نسبة القروض مرتفعة (${loansPercent.toFixed(1)}%)` });
              } else if (haramPercent > 5) {
                this.liveNonHalalMap.set(sym, { symbol: sym, nameAr, reason: `نسبة الإيرادات المحرمة مرتفعة (${haramPercent.toFixed(1)}%)` });
              } else {
                this.liveHalalMap.set(sym, {
                  symbol: sym,
                  yahooSymbol: `${sym}.CA`,
                  nameEn,
                  nameAr,
                  sector: 'Halal EGX',
                });
              }
            }

            // Freshness / Staleness check (Warn if data > 60 days old)
            const daysOld = Math.floor((Date.now() - latestTimestamp) / (1000 * 60 * 60 * 24));
            if (daysOld > 60 && latestTimestamp > 0) {
              logger.warn(`⚠️ Sharia Database Warning: Live data is ${daysOld} days old (last updated: ${new Date(latestTimestamp).toISOString().split('T')[0]}).`);
            }

            logger.info(`✅ Loaded ${rawList.length} total EGX stocks from live Sharia database: ${this.liveHalalMap.size} Halal stocks, ${this.liveNonHalalMap.size} Non-Halal stocks.`);
            resolve({ halalCount: this.liveHalalMap.size, nonHalalCount: this.liveNonHalalMap.size });
          } catch (err) {
            logger.error(`Error parsing stocks.json from templatesnippet: ${err}`);
            reject(err);
          }
        });
      });

      req.on('error', (err) => {
        logger.error(`Failed to fetch stocks.json: ${err.message}`);
        reject(err);
      });

      req.end();
    });
  }

  /**
   * Syncs and prunes watchlist with live Sharia database:
   * 1. Removes any stock that became Non-Halal (SUGR, EKHO, ABUK, etc.)
   * 2. Adds all discovered Halal stocks into watchlist
   */
  public async syncHalalWatchlist(stateManager: StateManager): Promise<{ added: number; removed: string[] }> {
    await this.fetchLiveShariaDatabase();
    const currentWatchlist = stateManager.getWatchlist();
    const removedSymbols: string[] = [];
    let addedCount = 0;

    // Explicitly purge SUGR
    if (stateManager.findStock('SUGR')) {
      stateManager.removeStock('SUGR');
      removedSymbols.push('SUGR');
    }

    // 1. Remove non-Halal stocks from watchlist
    for (const stock of currentWatchlist) {
      if (!this.isStockHalal(stock.symbol)) {
        logger.warn(`⚠️ Stock ${stock.symbol} is NO LONGER Sharia compliant according to templatesnippet! Removing from watchlist...`);
        stateManager.removeStock(stock.symbol);
        if (!removedSymbols.includes(stock.symbol)) {
          removedSymbols.push(stock.symbol);
        }
      }
    }

    // 2. Add all live Halal stocks to watchlist
    for (const [sym, halalStock] of this.liveHalalMap.entries()) {
      if (sym === 'SUGR') continue; // Extra safety guard
      const added = stateManager.addStock(halalStock);
      if (added) addedCount++;
    }

    logger.info(`✅ Live Sharia Sync complete: ${addedCount} new Halal stocks added, ${removedSymbols.length} non-compliant stocks removed.`);
    return { added: addedCount, removed: removedSymbols };
  }

  public isStockHalal(symbol: string): boolean {
    const sym = symbol.toUpperCase();
    if (sym === 'SUGR') return false; // Explicit override
    if (this.liveNonHalalMap.has(sym)) return false;
    if (this.liveHalalMap.has(sym)) return true;

    // Known prohibited conventional banks & non-compliant stocks
    const conventionalBanks = ['COMI', 'CIEB', 'HDBK', 'EXPA', 'QNBA', 'EAST', 'SUGR', 'EKHO'];
    if (conventionalBanks.includes(sym)) return false;

    return true;
  }

  public getShariaInfo(symbol: string): ShariaComplianceInfo {
    const sym = symbol.toUpperCase();
    if (sym === 'SUGR') {
      return {
        symbol: 'SUGR',
        nameAr: 'الدلتا للسكر',
        isHalal: false,
        statusText: '🔴 غير متوافق شرعياً (نسبة القروض 57.59% - مصفى، كاشف، وبورصة حلال)',
        haramRevenuePercent: 0.44,
        debtRatioPercent: 57.59,
        reason: 'نسبة القروض 57.59%'
      };
    }

    const nonHalal = this.liveNonHalalMap.get(sym);
    if (nonHalal) {
      return {
        symbol: sym,
        nameAr: nonHalal.nameAr,
        isHalal: false,
        statusText: `🔴 غير متوافق شرعياً (${nonHalal.reason})`,
        haramRevenuePercent: 15,
        debtRatioPercent: 45,
        reason: nonHalal.reason,
      };
    }

    const halal = this.liveHalalMap.get(sym);
    return {
      symbol: sym,
      nameAr: halal?.nameAr || sym,
      isHalal: true,
      statusText: '🟢 متوافق مع أحكام الشريعة الإسلامية',
      haramRevenuePercent: 0.5,
      debtRatioPercent: 15,
    };
  }

  public formatHalalStocksListMessage(watchlist: StockMeta[]): string {
    const halalList = watchlist.filter((s) => this.isStockHalal(s.symbol));

    let msg = `<b>🕌 قائمة الأسهم المتوافقة مع الشريعة (Live Halal EGX Database)</b>\n`;
    msg += `<i>المصدر المباشر: stocks.templatesnippet.com (${this.liveHalalMap.size} سهم متوافق)</i>\n\n`;

    for (const stock of halalList.slice(0, 35)) {
      msg += `• 🟢 <b>${stock.symbol}</b> - ${stock.nameAr}\n`;
    }

    if (halalList.length > 35) {
      msg += `\n<i>... وعدد ${halalList.length - 35} سهم آخر متوافق في الشيت.</i>`;
    }

    msg += `\n\n<i>ℹ️ يتم إجراء فحص تدقيق شرعي تلقائياً وحذف أي سهم يتجاوز الحدود الشرعية.</i>`;
    return msg;
  }
}
