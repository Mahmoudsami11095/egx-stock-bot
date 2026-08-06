import { DataFetcherService } from '../services/dataFetcher';
import { EgxLiveScraperService } from '../services/egxLiveScraperService';
import { StateManager } from '../services/stateManager';
import { logger } from '../services/logger';

async function testRealTimeSystem() {
  logger.info('=== Testing Real-Time EGX Market Data & Multi-Provider Engine ===');

  const stateManager = new StateManager();
  const watchlist = stateManager.getWatchlist().slice(0, 5);
  const dataFetcher = new DataFetcherService();

  logger.info('\n1. Testing Cache-Busted TradingView Batch Fetch...');
  const tvResults = await dataFetcher.getBatchQuoteAndIndicators(watchlist, 'tradingview');
  logger.info(`Fetched ${tvResults.length} quotes from TradingView. Sample: ${tvResults[0]?.stock.symbol} @ ${tvResults[0]?.quote.currentPrice}`);

  logger.info('\n2. Testing Cache-Busted Yahoo Finance Batch Fetch...');
  const yfResults = await dataFetcher.getBatchQuoteAndIndicators(watchlist, 'yahoo');
  logger.info(`Fetched ${yfResults.length} quotes from Yahoo Finance. Sample: ${yfResults[0]?.stock.symbol} @ ${yfResults[0]?.quote.currentPrice}`);

  logger.info('\n3. Testing Live Scraper Engine (High Frequency Poller)...');
  const scraper = new EgxLiveScraperService();
  let ticksReceived = 0;

  scraper.on('priceTick', (tick) => {
    ticksReceived++;
    logger.info(`⚡ Live Tick Broadcast #${ticksReceived}: ${tick.symbol} => ${tick.price} EGP (Change: ${tick.changePercent}%, Vol: ${tick.volume})`);
  });

  scraper.start(watchlist);

  await new Promise((resolve) => setTimeout(resolve, 9000));
  scraper.stop();

  logger.info(`\n✅ Test Completed. Total real-time price ticks captured: ${ticksReceived}`);
  process.exit(0);
}

testRealTimeSystem().catch((e) => {
  logger.error(`Test failed: ${e}`);
  process.exit(1);
});
