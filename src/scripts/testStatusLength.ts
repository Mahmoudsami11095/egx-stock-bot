import { INITIAL_STOCKS } from '../constants/stocks';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { formatWatchlistStatus } from '../bot/templates';

async function testStatusLength() {
  const fetcher = new DataFetcherService();
  const detector = new SignalDetectorService();

  console.log('🔍 Testing formatWatchlistStatus output length & character escaping...');

  try {
    const results = await fetcher.getBatchQuoteAndIndicators(INITIAL_STOCKS);
    const analyses = results.map((r) =>
      detector.analyzeStockWithIndicators(r.stock, r.quote, r.indicators, r.automatedFairValue)
    );

    const htmlText = formatWatchlistStatus(analyses);
    console.log(`\n📏 Total Message Length: ${htmlText.length} characters (Telegram Limit: 4096)`);

    if (htmlText.length > 4096) {
      console.error('❌ CRITICAL ERROR: Message exceeds 4096 characters! Telegram will reject it.');
    } else {
      console.log('✅ Message length is within Telegram limit!');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testStatusLength();
