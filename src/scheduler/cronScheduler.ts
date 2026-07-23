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

    // 2. Scan Stocks Watchlist
    const watchlist = this.stateManager.getWatchlist();

    for (const stock of watchlist) {
      try {
        const { quote, indicators, automatedFairValue } = await this.dataFetcher.getQuoteAndIndicators(stock);
        const analysis = this.signalDetector.analyzeStockWithIndicators(stock, quote, indicators, automatedFairValue);
        logger.info(`[Scan] ${stock.symbol}: ${quote.currentPrice} EGP | Fair Value: ${automatedFairValue} EGP | Signal: ${analysis.signalType}`);

        if (this.stateManager.shouldSendAlert(stock.symbol, analysis.signalType, quote.currentPrice)) {
          logger.info(`🚨 New signal for ${stock.symbol}! Sending Telegram alert...`);
          await this.telegramBot.sendNotificationCard(analysis);
        }
      } catch (error) { logger.error(`Error scanning ${stock.symbol}: ${error}`); }
    }
    logger.info('✅ Market scan completed.');
  }
}
