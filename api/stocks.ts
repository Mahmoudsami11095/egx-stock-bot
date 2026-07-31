import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DataFetcherService } from '../src/services/dataFetcher';
import { SignalDetectorService } from '../src/services/signalDetector';
import { StateManager } from '../src/services/stateManager';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const stateManager = new StateManager();
    const dataFetcher = new DataFetcherService();
    const signalDetector = new SignalDetectorService();

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
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch live stock data' });
  }
}
