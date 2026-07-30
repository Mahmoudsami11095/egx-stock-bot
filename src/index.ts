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

  // REST API Endpoints for Angular SPA
  app.get('/api/stocks', async (req, res) => {
    try {
      const watchlist = stateManager.getWatchlist();
      const batchResults = await dataFetcher.getBatchQuoteAndIndicators(watchlist);
      const results = [];
      for (const item of batchResults) {
        const analysis = signalDetector.analyzeStockWithIndicators(
          item.stock,
          item.quote,
          item.indicators,
          item.automatedFairValue
        );
        results.push(analysis);
      }
      res.json(results);
    } catch (err: any) {
      logger.error(`Error in /api/stocks: ${err}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/gold', async (req, res) => {
    try {
      const usdEgp = await dataFetcher.fetchUsdEgp();
      const goldUsd = 2410.5;
      const gold24k = Number(((goldUsd / 31.1035) * usdEgp).toFixed(2));
      const gold21k = Number((gold24k * 0.875).toFixed(2));
      const gold18k = Number((gold24k * 0.750).toFixed(2));
      const goldCoin = Number((gold21k * 8).toFixed(2));

      res.json({
        goldUsdPerOz: goldUsd,
        usdEgpRate: usdEgp,
        gold24kEgp: gold24k,
        gold21kEgp: gold21k,
        gold18kEgp: gold18k,
        goldCoinEgp: goldCoin,
        signalType: 'BUY',
        rsi: 42.5
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

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
