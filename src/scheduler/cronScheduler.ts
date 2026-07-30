import cron from 'node-cron';
import { config } from '../config/environment';
import { StateManager } from '../services/stateManager';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { GoldService } from '../services/goldService';
import { ShariaService } from '../services/shariaService';
import { ExportService } from '../services/exportService';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { TelegramBotService } from '../bot/telegramBot';
import { logger } from '../services/logger';

export class CronSchedulerService {
  private goldService = new GoldService();
  private shariaService = new ShariaService();
  private exportService = new ExportService();
  private googleSheetsService = new GoogleSheetsService();

  constructor(
    private stateManager: StateManager,
    private dataFetcher: DataFetcherService,
    private signalDetector: SignalDetectorService,
    private telegramBot: TelegramBotService
  ) {}

  public startSchedule(): void {
    const cronExpr = config.cronSchedule;
    logger.info(`⏰ Starting Automated Market Monitor Cron Schedule (${cronExpr})`);
    
    // 1. Regular 5-minute stock & gold market scan
    cron.schedule(cronExpr, async () => { await this.runMarketScan(); });
    setImmediate(async () => { await this.runMarketScan(); });

    // 2. Weekly Sharia Audit Sync Cron (Every Sunday at 2:00 AM: '0 2 * * 0')
    logger.info(`🕌 Scheduling Weekly Sharia Audit Sync ('0 2 * * 0')...`);
    cron.schedule('0 2 * * 0', async () => { await this.runWeeklyShariaAudit(); });
    
    // Initial Sharia database sync on startup
    setImmediate(async () => { await this.runWeeklyShariaAudit(); });

    // 3. Daily Market Close Excel & Google Sheet Sync (Sun-Thu at 3:00 PM: '0 15 * * 0-4')
    logger.info(`📁 Scheduling Daily Market Close Excel & Google Sheet Sync ('0 15 * * 0-4')...`);
    cron.schedule('0 15 * * 0-4', async () => { await this.sendDailySheetReport(); });
  }

  public async sendDailySheetReport(): Promise<void> {
    logger.info('📊 Generating Daily Market Close Excel/CSV Sheet Report...');
    try {
      const { regime } = await this.dataFetcher.detectMarketRegime();
      const watchlist = this.stateManager.getWatchlist();
      const batchResults = await this.dataFetcher.getBatchQuoteAndIndicators(watchlist);
      const analyses = batchResults.map((r) =>
        this.signalDetector.analyzeStockWithIndicators(r.stock, r.quote, r.indicators, r.automatedFairValue, r.fairValueConfidence, regime)
      );

      analyses.sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);

      // 1. Sync Live Google Sheet (Online)
      await this.googleSheetsService.syncToGoogleSheet(analyses);

      // 2. Generate and send CSV file
      const filePath = this.exportService.generateCsv(analyses);
      await this.telegramBot.sendDocumentToSubscribers(
        filePath,
        '📊 **تقرير شيت البيانات اليومي الختامي لأسهم البورصة المصرية والقيم العادلة وتوصيات الشراء**'
      );
    } catch (err) {
      logger.error(`Error sending daily sheet report: ${err}`);
    }
  }

  public async runWeeklyShariaAudit(): Promise<void> {
    logger.info('🕌 Running Live Sharia Compliance Audit from stocks.templatesnippet.com ...');
    try {
      const { added, removed } = await this.shariaService.syncHalalWatchlist(this.stateManager);
      
      if (removed.length > 0) {
        const msg = `
<b>⚠️ تنويه شرعي هام (Live Sharia Compliance Alert)</b>

تم فحص قاعدة البيانات المباشرة للأسهم (stocks.templatesnippet.com)، وتم استبعاد الأسهم التالية من قائمة المتابعة لعدم توافقها شرعياً:
<b>${removed.join(', ')}</b>
`.trim();
        await this.telegramBot.broadcastRawMessage(msg);
      }
    } catch (err) {
      logger.error(`Error running weekly Sharia audit: ${err}`);
    }
  }

  public async runMarketScan(): Promise<void> {
    logger.info('🔍 Starting automated market scan via TradingView...');

    // 1. Scan Gold
    try {
      const goldPrices = await this.goldService.getLiveGoldPrices();
      logger.info(`[Gold Scan] XAU/USD: $${goldPrices.goldUsdPerOz} | 21K: ${goldPrices.gold21kEgp} EGP | Signal: ${goldPrices.signalType} | RSI: ${goldPrices.rsi}`);

      if (this.stateManager.shouldSendAlert('GOLD', goldPrices.signalType, goldPrices.goldUsdPerOz)) {
        logger.info(`🚨 New Gold Buy/Sell Signal triggered! Sending Telegram alert...`);
        const goldMsg = this.goldService.formatGoldMessage(goldPrices);
        await this.telegramBot.broadcastRawMessage(goldMsg);
      }
    } catch (err) {
      logger.error(`Error scanning Gold: ${err}`);
    }

    // 2. Batch Scan Stocks Watchlist (<1s)
    try {
      const { regime } = await this.dataFetcher.detectMarketRegime();
      const watchlist = this.stateManager.getWatchlist();
      const batchResults = await this.dataFetcher.getBatchQuoteAndIndicators(watchlist);

      for (const r of batchResults) {
        const analysis = this.signalDetector.analyzeStockWithIndicators(r.stock, r.quote, r.indicators, r.automatedFairValue, r.fairValueConfidence, regime);
        logger.info(`[Scan] ${r.stock.symbol}: ${r.quote.currentPrice} EGP | Fair Value: ${r.automatedFairValue} EGP | Signal: ${analysis.signalType} | Regime: ${regime}`);

        if (this.stateManager.shouldSendAlert(r.stock.symbol, analysis.signalType, r.quote.currentPrice)) {
          logger.info(`🚨 New signal for ${r.stock.symbol}! Sending Telegram alert...`);
          await this.telegramBot.sendNotificationCard(analysis);
        }
      }
    } catch (error) {
      logger.error(`Error scanning stocks watchlist: ${error}`);
    }

    logger.info('✅ Market scan completed.');
  }
}
