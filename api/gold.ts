import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoldService } from '../src/services/goldService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const goldService = new GoldService();
    const goldPrices = await goldService.getLiveGoldPrices();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json({
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
    return res.status(500).json({ error: err?.message || 'Failed to fetch live gold prices' });
  }
}
