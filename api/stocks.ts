import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DataFetcherService } from '../src/services/dataFetcher';
import { SignalDetectorService } from '../src/services/signalDetector';
import { ShariaService } from '../src/services/shariaService';
import { INITIAL_STOCKS } from '../src/constants/stocks';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const dataFetcher = new DataFetcherService();
    const signalDetector = new SignalDetectorService();
    const shariaService = new ShariaService();

    // Fetch live Sharia database to get all current Halal stocks
    try {
      await shariaService.fetchLiveShariaDatabase();
    } catch (e) {
      console.warn('Live Sharia DB fetch warn:', e);
    }

    const halalStocks = shariaService.getHalalStocksList();
    const stocksToScan = halalStocks.length > 0 ? halalStocks : INITIAL_STOCKS;

    const batchResults = await dataFetcher.getBatchQuoteAndIndicators(stocksToScan);
    const results = [];

    for (const item of batchResults) {
      const analysis: any = signalDetector.analyzeStockWithIndicators(
        item.stock,
        item.quote,
        item.indicators,
        item.automatedFairValue,
        item.fairValueConfidence
      );

      const shariaInfo = shariaService.getShariaInfo(item.stock.symbol);
      analysis.shariaTier = shariaInfo.tier;
      analysis.shariaStatusText = shariaInfo.statusText;
      if (shariaInfo.purificationPercent !== undefined) {
        analysis.purificationPercent = shariaInfo.purificationPercent;
      }

      results.push(analysis);
    }

    if (results.length > 0) {
      results.sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
      return res.status(200).json(results);
    }
  } catch (err: any) {
    console.error('Error fetching dynamic live stock quotes:', err);
  }

  return res.status(200).json([]);
}
