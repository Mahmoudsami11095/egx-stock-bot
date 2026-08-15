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
import { IntradayTrackerService } from './services/intradayTracker';

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { EgxLiveScraperService } from './services/egxLiveScraperService';

async function bootstrap() {
  logger.info('=====================================================');
  logger.info('🚀 Launching EGX Stock Signal Telegram Bot & Web System');
  logger.info('=====================================================');

  const stateManager = new StateManager();
  const dataFetcher = new DataFetcherService();
  const signalDetector = new SignalDetectorService();
  const goldService = new GoldService();
  const shariaService = new ShariaService();
  const intradayTracker = new IntradayTrackerService();
  const telegramBot = new TelegramBotService(stateManager, dataFetcher, signalDetector, intradayTracker);
  const cronScheduler = new CronSchedulerService(stateManager, dataFetcher, signalDetector, telegramBot, intradayTracker);
  const egxLiveScraper = new EgxLiveScraperService();

  // 1. Create HTTP & WebSocket Server for Angular SPA & Live Tick Feed
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const port = process.env.PORT || 5000;
  const angularDistPath = path.join(process.cwd(), 'frontend', 'dist', 'frontend', 'browser');

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws/live-stocks' || url.pathname === '/ws/live-stocks/') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (e) {
      socket.destroy();
    }
  });

  app.get('/ws/live-stocks', (req, res) => {
    res.status(200).send('EGX WebSocket Server is Active. Upgrade to WebSocket protocol (ws:// or wss://) to stream live prices.');
  });

  wss.on('connection', (ws: WebSocket) => {
    logger.info('🔌 New WebSocket client connected for live EGX updates.');
    // Send cached snapshot immediately on connect
    const initialQuotes = egxLiveScraper.getAllCachedQuotes();
    if (initialQuotes.length > 0) {
      ws.send(JSON.stringify({ type: 'SNAPSHOT', data: initialQuotes }));
    }

    ws.on('close', () => {
      logger.info('🔌 WebSocket client disconnected.');
    });
  });

  // Broadcast price ticks to all connected clients and check live intraday trade closures
  egxLiveScraper.on('priceTick', async (update) => {
    const payload = JSON.stringify({ type: 'TICK', data: update });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    if (intradayTracker.getOpenTrades().length > 0) {
      try {
        await intradayTracker.checkTradeClosures(
          [{ symbol: update.symbol, price: update.price, high: update.high, low: update.low }],
          telegramBot
        );
      } catch (err) {
        logger.error(`Error in live priceTick intraday trade closure check: ${err}`);
      }
    }
  });

  // Start EGX Live Scraper background engine
  const watchlist = stateManager.getWatchlist();
  egxLiveScraper.start(watchlist);

  // REST API Endpoints for Angular SPA
  app.get('/api/stocks', async (req, res) => {
    try {
      const source = (req.query.source as any) || 'tradingview';
      const useOverrides = req.query.use_overrides === 'true';
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

  app.get('/api/fair-value-compare', async (req, res) => {
    try {
      const watchlist = stateManager.getWatchlist();
      const requestedSources = req.query.sources
        ? (req.query.sources as string).split(',').map(s => s.trim() as any).filter(Boolean)
        : (['tradingview', 'mubasher', 'investing', 'yahoo'] as any[]);

      // Run batch fetches in parallel with error isolation
      const fetchTasks = requestedSources.map(async (source: any) => {
        try {
          const results = await dataFetcher.getBatchQuoteAndIndicators(watchlist, source);
          return { source, results, success: true };
        } catch (err: any) {
          logger.warn(`Source [${source}] failed during fair-value-compare: ${err?.message || err}`);
          return { source, results: [], success: false };
        }
      });

      const sourceOutputs = await Promise.all(fetchTasks);

      // Map by symbol
      const comparisonMap = new Map<string, any>();

      for (const stock of watchlist) {
        const shariaInfo = shariaService.getShariaInfo(stock.symbol);
        comparisonMap.set(stock.symbol, {
          symbol: stock.symbol,
          nameEn: stock.nameEn,
          nameAr: stock.nameAr,
          sector: stock.sector,
          yahooSymbol: stock.yahooSymbol,
          isHalal: shariaInfo.isHalal,
          shariaTier: shariaInfo.tier,
          sources: {} as Record<string, any>,
          currentPrice: 0,
          fairValues: [] as number[],
          averageFairValue: 0,
          medianFairValue: 0,
          minFairValue: 0,
          maxFairValue: 0,
          spreadPercent: 0,
          averageUpsidePercent: 0,
          consensusStatus: 'FAIR',
          highestDiscrepancySource: null as string | null
        });
      }

      for (const { source, results } of sourceOutputs) {
        for (const item of results) {
          const entry = comparisonMap.get(item.stock.symbol);
          if (!entry) continue;

          const price = item.quote.currentPrice;
          if (price > 0 && (!entry.currentPrice || source === 'tradingview' || source === 'mubasher')) {
            entry.currentPrice = price;
          }

          const fv = item.automatedFairValue;
          const upside = price > 0 ? Number((((fv - price) / price) * 100).toFixed(2)) : 0;

          entry.sources[source] = {
            currentPrice: price,
            fairValue: fv,
            confidence: item.fairValueConfidence,
            upsidePercent: upside,
            changePercent: item.quote.changePercent,
            volume: item.quote.volume,
            dayHigh: item.quote.dayHigh,
            dayLow: item.quote.dayLow
          };

          if (fv > 0) {
            entry.fairValues.push(fv);
          }
        }
      }

      // Compute statistics for each stock
      const finalResults = Array.from(comparisonMap.values()).map((item) => {
        const values: number[] = item.fairValues;
        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = Number((sum / values.length).toFixed(2));
          item.averageFairValue = avg;

          // Median
          const sorted = [...values].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          item.medianFairValue = sorted.length % 2 !== 0 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));

          item.minFairValue = sorted[0];
          item.maxFairValue = sorted[sorted.length - 1];

          // Spread % = (max - min) / avg * 100
          item.spreadPercent = avg > 0 ? Number((((item.maxFairValue - item.minFairValue) / avg) * 100).toFixed(2)) : 0;

          if (item.currentPrice > 0) {
            item.averageUpsidePercent = Number((((avg - item.currentPrice) / item.currentPrice) * 100).toFixed(2));
          }

          if (item.averageUpsidePercent >= 15) {
            item.consensusStatus = 'STRONGLY_UNDERVALUED';
          } else if (item.averageUpsidePercent >= 5) {
            item.consensusStatus = 'UNDERVALUED';
          } else if (item.averageUpsidePercent <= -15) {
            item.consensusStatus = 'STRONGLY_OVERVALUED';
          } else if (item.averageUpsidePercent <= -5) {
            item.consensusStatus = 'OVERVALUED';
          } else {
            item.consensusStatus = 'FAIR';
          }

          // Identify source with largest deviation from average
          let maxDiff = -1;
          let maxDiffSource: string | null = null;
          for (const [src, data] of Object.entries(item.sources) as [string, any][]) {
            const diff = Math.abs(data.fairValue - avg);
            if (diff > maxDiff) {
              maxDiff = diff;
              maxDiffSource = src;
            }
          }
          item.highestDiscrepancySource = maxDiffSource;
        }
        return item;
      });

      res.json(finalResults);
    } catch (err: any) {
      logger.error(`Error in /api/fair-value-compare: ${err}`);
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

  app.get('/api/intraday-trades', async (req, res) => {
    try {
      res.json({
        success: true,
        open: intradayTracker.getOpenTrades(),
        closed: intradayTracker.getClosedTrades()
      });
    } catch (err: any) {
      logger.error(`Error in /api/intraday-trades: ${err}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.all('/api/update-overrides', async (req, res) => {
    try {
      const updateOverridesHandler = require('../api/update-overrides.js');
      await updateOverridesHandler(req, res);
    } catch (err: any) {
      logger.error(`Error in /api/update-overrides: ${err}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/github-webhook', (req, res) => {
    const { exec } = require('child_process');
    logger.info('⚡ GitHub Webhook received! Syncing latest code...');
    exec('/home/azureuser/egx-stock-bot/auto_git_pull.sh', (err: any, stdout: any, stderr: any) => {
      if (err) logger.error(`Webhook sync error: ${stderr}`);
      else logger.info(`Webhook sync output: ${stdout}`);
    });
    res.json({ status: 'ok', message: 'Deployment triggered successfully' });
  });

  app.use(express.static(angularDistPath));

  // Fallback route for Angular SPA client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(angularDistPath, 'index.html'));
  });

  server.listen(Number(port), '0.0.0.0', () => {
    logger.info(`🌐 Angular Web Application & WebSocket Server live at: http://0.0.0.0:${port} (Public Access)`);
    logger.info(`⚡ Live WebSocket Stream Endpoint: ws://localhost:${port}/ws/live-stocks`);
  });

  const disableBot = process.env.DISABLE_TELEGRAM_BOT === 'true';

  if (!disableBot) {
    // 2. Start Telegram bot instance
    await telegramBot.start();
  } else {
    logger.info('⚠️ Telegram Bot polling is DISABLED via DISABLE_TELEGRAM_BOT=true to save RAM.');
  }

  // 3. Start scheduled market monitoring (Website automation requires this to run)
  cronScheduler.startSchedule();

  // Graceful shutdown handling
  process.once('SIGINT', () => {
    logger.info('Stopping application...');
    if (!disableBot) telegramBot.stop('SIGINT');
    process.exit(0);
  });

  process.once('SIGTERM', () => {
    logger.info('Stopping application...');
    if (!disableBot) telegramBot.stop('SIGTERM');
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  logger.error(`Fatal application startup failure: ${error}`);
});
