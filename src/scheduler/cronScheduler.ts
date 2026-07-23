import cron from 'node-cron';
import { config } from '../config/environment';
import { StateManager } from '../services/stateManager';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { TelegramBotService } from '../bot/telegramBot';
import { logger } from '../services/logger';

export class CronSchedulerService {
  constructor(
    private stateManager: StateManager,
    private dataFetcher: DataFetcherService,
    private signalDetector: SignalDetectorService,
    private telegramBot: TelegramBotService
  ) {}

  public startSchedule(): void {
    const cronExpr = config.cronSchedule;
    logger.info(`⏰ Starting Automated Market Monitor Cron Schedule (${cronExpr})`);

    cron.schedule(cronExpr, async () => {
      await this.runMarketScan();
    });

    // Run initial scan on startup
    setImmediate(async () => {
      await this.runMarketScan();
    });
  }

  public async runMarketScan(): Promise<void> {
    logger.info('🔍 Starting automated market scan for watched EGX stocks via TradingView...');
    const watchlist = this.stateManager.getWatchlist();

    for (const stock of watchlist) {
      try {
        const { quote, indicators, automatedFairValue } = await this.dataFetcher.getQuoteAndIndicators(stock);
        const analysis = this.signalDetector.analyzeStockWithIndicators(stock, quote, indicators, automatedFairValue);

        logger.info(
          `[Scan] ${stock.symbol} (${stock.nameAr}): ${quote.currentPrice} EGP | Dynamic Fair Value: ${automatedFairValue} EGP | Signal: ${analysis.signalType}`
        );

        // Deduplication & alert decision
        const shouldSend = this.stateManager.shouldSendAlert(
          stock.symbol,
          analysis.signalType,
          quote.currentPrice
        );

        if (shouldSend) {
          logger.info(`🚨 New actionable signal triggered for ${stock.symbol}! Sending alert...`);
          await this.telegramBot.sendNotificationCard(analysis);
        }
      } catch (error) {
        logger.error(`Error scanning ${stock.symbol}: ${error}`);
      }
    }

    logger.info('✅ Market scan completed.');
  }
}
