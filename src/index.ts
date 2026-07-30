import path from 'path';
import express from 'express';
import { StateManager } from './services/stateManager';
import { DataFetcherService } from './services/dataFetcher';
import { SignalDetectorService } from './services/signalDetector';
import { TelegramBotService } from './bot/telegramBot';
import { CronSchedulerService } from './scheduler/cronScheduler';
import { logger } from './services/logger';

async function bootstrap() {
  logger.info('=====================================================');
  logger.info('🚀 Launching EGX Stock Signal Telegram Bot & Web System');
  logger.info('=====================================================');

  const stateManager = new StateManager();
  const dataFetcher = new DataFetcherService();
  const signalDetector = new SignalDetectorService();
  const telegramBot = new TelegramBotService(stateManager, dataFetcher, signalDetector);
  const cronScheduler = new CronSchedulerService(stateManager, dataFetcher, signalDetector, telegramBot);

  // 1. Start Express Web Server for Angular App
  const app = express();
  const port = process.env.PORT || 3000;
  const angularDistPath = path.join(process.cwd(), 'frontend', 'dist', 'frontend', 'browser');

  app.use(express.static(angularDistPath));

  // Fallback route for Angular SPA client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(angularDistPath, 'index.html'));
  });

  app.listen(Number(port), '0.0.0.0', () => {
    logger.info(`🌐 Angular Web Application live at: http://0.0.0.0:${port} (Public Access)`);
  });

  // 2. Start Telegram bot instance
  await telegramBot.start();

  // 3. Start scheduled market monitoring
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
