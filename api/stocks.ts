import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DataFetcherService } from '../src/services/dataFetcher';
import { SignalDetectorService } from '../src/services/signalDetector';
import { ShariaService } from '../src/services/shariaService';

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

    // 1. Fetch live real-time EGX quotes for top 120 stocks directly from TradingView in 1 request (~200ms)
    const scanResults = await dataFetcher.fetchFullEgxScan(120);

    // 2. Fetch live Sharia DB status (optional enrichment)
    try {
      await shariaService.fetchLiveShariaDatabase();
    } catch (_) {}

    const results = [];

    for (const item of scanResults) {
      const shariaInfo = shariaService.getShariaInfo(item.stock.symbol);
      
      item.stock.nameAr = shariaInfo.nameAr || item.stock.nameAr;
      item.quote.nameAr = shariaInfo.nameAr || item.quote.nameAr;

      const analysis: any = signalDetector.analyzeStockWithIndicators(
        item.stock,
        item.quote,
        item.indicators,
        item.automatedFairValue,
        item.fairValueConfidence
      );

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
