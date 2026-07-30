import { StateManager } from '../services/stateManager';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { TelegramBotService } from '../bot/telegramBot';

async function testNotifications() {
  const stateManager = new StateManager();
  const dataFetcher = new DataFetcherService();
  const signalDetector = new SignalDetectorService();
  const telegramBot = new TelegramBotService(stateManager, dataFetcher, signalDetector);

  console.log('🔍 Testing notification pipeline...');

  const subscribers = stateManager.getSubscribers();
  console.log(`📋 Subscribers registered in subscribers.json (${subscribers.length}):`, subscribers);

  const { regime } = await dataFetcher.detectMarketRegime();
  console.log(`🌐 Detected Market Regime: ${regime}`);

  const watchlist = stateManager.getWatchlist();
  console.log(`📊 Scanning ${watchlist.length} Halal stocks...`);

  const batchResults = await dataFetcher.getBatchQuoteAndIndicators(watchlist.slice(0, 15));
  const analyses = batchResults.map((r) =>
    signalDetector.analyzeStockWithIndicators(r.stock, r.quote, r.indicators, r.automatedFairValue, r.fairValueConfidence, regime)
  );

  const buySignals = analyses.filter((a) => a.signalType === 'BUY' || a.signalType === 'STRONG_BUY');
  const sellSignals = analyses.filter((a) => a.signalType === 'SELL' || a.signalType === 'STRONG_SELL');
  const neutralSignals = analyses.filter((a) => a.signalType === 'NEUTRAL');

  console.log(`\n📊 Scan Signal Summary:`);
  console.log(`- 🟢 BUY / STRONG_BUY: ${buySignals.length}`);
  console.log(`- 🔴 SELL / STRONG_SELL: ${sellSignals.length}`);
  console.log(`- 🟡 NEUTRAL: ${neutralSignals.length}`);

  if (buySignals.length > 0) {
    console.log('\nSample BUY Signal:', buySignals[0].quote.symbol, buySignals[0].signalType, buySignals[0].signalScore);
  } else if (analyses.length > 0) {
    console.log('\nTop Upside Stock Sample:', analyses[0].quote.symbol, 'Score:', analyses[0].signalScore, 'Fair Value:', analyses[0].fairValue);
  }
}

testNotifications();
