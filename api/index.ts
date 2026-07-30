import express from 'express';
import { DataFetcherService } from '../src/services/dataFetcher';
import { ShariaService } from '../src/services/shariaService';
import { SignalDetectorService } from '../src/services/signalDetector';

const app = express();
const dataFetcher = new DataFetcherService();
const shariaService = new ShariaService();
const signalDetector = new SignalDetectorService();

app.get('/api/stocks', async (req, res) => {
  try {
    const watchlist = shariaService.getHalalStocks();
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
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gold', async (req, res) => {
  try {
    const usdEgp = await dataFetcher.fetchUsdEgp();
    const goldUsd = 2410.5;
    const gold24k = Number(((goldUsd / 31.1035) * (usdEgp || 48.5)).toFixed(2));
    const gold21k = Number((gold24k * 0.875).toFixed(2));
    const gold18k = Number((gold24k * 0.750).toFixed(2));
    const goldCoin = Number((gold21k * 8).toFixed(2));

    res.json({
      goldUsdPerOz: goldUsd,
      usdEgpRate: usdEgp || 48.5,
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

export default app;
