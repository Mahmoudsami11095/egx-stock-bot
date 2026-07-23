import { StateManager } from '../services/stateManager';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { formatSignalCard } from '../bot/templates';

async function testDryRun() {
  console.log('🧪 Starting dry-run test scan for EGX stocks...\n');

  const stateManager = new StateManager();
  const dataFetcher = new DataFetcherService();
  const signalDetector = new SignalDetectorService();

  const watchlist = stateManager.getWatchlist();

  for (const stock of watchlist) {
    try {
      console.log(`-----------------------------------------------------`);
      console.log(`🔍 Fetching: ${stock.symbol} (${stock.nameAr})...`);

      const quote = await dataFetcher.getQuote(stock);
      const candles = await dataFetcher.getHistoricalCandles(stock, 90);
      const analysis = signalDetector.analyzeStock(stock, quote, candles);

      console.log(`✅ Success! Current Price: ${quote.currentPrice} EGP | RSI: ${analysis.indicators.rsi} | Signal: ${analysis.signalType}`);
      console.log(formatSignalCard(analysis));
    } catch (err) {
      console.error(`❌ Failed to fetch/analyze ${stock.symbol}: ${err}`);
    }
  }

  console.log('\n✅ Dry-run test completed successfully.');
}

testDryRun();
