import { StateManager } from './services/stateManager';
import { DataFetcherService } from './services/dataFetcher';
import { SignalDetectorService } from './services/signalDetector';
import { TelegramBotService } from './bot/telegramBot';
import { CronSchedulerService } from './scheduler/cronScheduler';
import { logger } from './services/logger';

async function bootstrap() {
  logger.info('=====================================================');
  logger.info('🚀 Launching EGX Stock Signal Telegram Bot System');
  logger.info('=====================================================');

  const stateManager = new StateManager();
  const dataFetcher = new DataFetcherService();
  const signalDetector = new SignalDetectorService();
  const telegramBot = new TelegramBotService(stateManager, dataFetcher, signalDetector);
  const cronScheduler = new CronSchedulerService(stateManager, dataFetcher, signalDetector, telegramBot);

  // Start Telegram bot instance
  await telegramBot.start();

  // Start scheduled market monitoring
  cronScheduler.startSchedule();

  // Graceful shutdown handling
  process.once('SIGINT', () => {
    logger.info('Stopping application...');
    telegramBot.stop('SIGINT');
    process.exit(0);
  });

  process.once('SIGTERM', () => {
    logger.info('Stopping application...');
    telegramBot.stop('SIGTERM');
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  logger.error(`Fatal application startup failure: ${error}`);
});
