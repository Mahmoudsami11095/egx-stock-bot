import path from 'path';
import express from 'express';
import { StateManager } from './services/stateManager';
import { DataFetcherService } from './services/dataFetcher';
import { SignalDetectorService } from './services/signalDetector';
import { TelegramBotService } from './bot/telegramBot';
import { CronSchedulerService } from './scheduler/cronScheduler';
import { logger } from './services/logger';

import { GoldService } from './services/goldService';
import { ShariaService } from './services/shariaService';

async function bootstrap() {
  logger.info('=====================================================');
  logger.info('🚀 Launching EGX Stock Signal Telegram Bot & Web System');
  logger.info('=====================================================');

  const stateManager = new StateManager();
  const dataFetcher = new DataFetcherService();
  const signalDetector = new SignalDetectorService();
  const goldService = new GoldService();
  const shariaService = new ShariaService();
  const telegramBot = new TelegramBotService(stateManager, dataFetcher, signalDetector);
  const cronScheduler = new CronSchedulerService(stateManager, dataFetcher, signalDetector, telegramBot);

  // 1. Start Express Web Server for Angular App
  const app = express();
  const port = process.env.PORT || 3000;
  const angularDistPath = path.join(process.cwd(), 'frontend', 'dist', 'frontend', 'browser');

  // REST API Endpoints for Angular SPA
  app.get('/api/stocks', async (req, res) => {
    try {
      const source = (req.query.source as any) || 'tradingview';
      const watchlist = stateManager.getWatchlist();
      const batchResults = await dataFetcher.getBatchQuoteAndIndicators(watchlist, source);
      const results = [];
      for (const item of batchResults) {
        const analysis = signalDetector.analyzeStockWithIndicators(
          item.stock,
          item.quote,
          item.indicators,
          item.automatedFairValue,
          item.fairValueConfidence,
          dataFetcher.getMarketRegime()
        );

        // Enrich with real-time Sharia Compliance metrics (Zakat & Purification)
        const shariaInfo = shariaService.getShariaInfo(item.stock.symbol);
        analysis.shariaInfo = {
          isHalal: shariaInfo.isHalal,
          tier: shariaInfo.tier,
          statusText: shariaInfo.statusText,
          haramRevenuePercent: shariaInfo.haramRevenuePercent,
          debtRatioPercent: shariaInfo.debtRatioPercent,
          purificationPercent: shariaInfo.purificationPercent,
          reason: shariaInfo.reason
        };

        // Flat compatibility fields for legacy frontend bindings
        (analysis as any).shariaTier = shariaInfo.tier;
        (analysis as any).shariaStatusText = shariaInfo.statusText;
        (analysis as any).purificationPercent = shariaInfo.purificationPercent;

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
      const goldPrices = await goldService.getLiveGoldPrices();
      res.json({
        goldUsdPerOz: goldPrices.goldUsdPerOz,
        usdEgpRate: goldPrices.usdToEgp,
        gold24kEgp: goldPrices.gold24kEgp,
        gold21kEgp: goldPrices.gold21kEgp,
        gold18kEgp: goldPrices.gold18kEgp,
        goldCoinEgp: goldPrices.goldSovereignEgp,
        signalType: goldPrices.signalType,
        rsi: goldPrices.rsi
      });
    } catch (err: any) {
      logger.error(`Error fetching live gold prices: ${err}`);
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
