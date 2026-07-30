import cron from 'node-cron';
import { config } from '../config/environment';
import { StateManager } from '../services/stateManager';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { GoldService } from '../services/goldService';
import { TelegramBotService } from '../bot/telegramBot';
import { logger } from '../services/logger';

export class CronSchedulerService {
  private goldService = new GoldService();

  constructor(
    private stateManager: StateManager,
    private dataFetcher: DataFetcherService,
    private signalDetector: SignalDetectorService,
    private telegramBot: TelegramBotService
  ) {}

  public startSchedule(): void {
    const cronExpr = config.cronSchedule;
    logger.info(`⏰ Starting Automated Market Monitor Cron Schedule (${cronExpr})`);
    cron.schedule(cronExpr, async () => { await this.runMarketScan(); });
    setImmediate(async () => { await this.runMarketScan(); });
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
      const watchlist = this.stateManager.getWatchlist();
      const batchResults = await this.dataFetcher.getBatchQuoteAndIndicators(watchlist);

      for (const r of batchResults) {
        const analysis = this.signalDetector.analyzeStockWithIndicators(r.stock, r.quote, r.indicators, r.automatedFairValue);
        logger.info(`[Scan] ${r.stock.symbol}: ${r.quote.currentPrice} EGP | Fair Value: ${r.automatedFairValue} EGP | Signal: ${analysis.signalType}`);

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
