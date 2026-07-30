import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const goldData = {
      goldUsdPerOz: 4111.10,
      usdEgpRate: 51.07,
      gold24kEgp: 6828,
      gold21kEgp: 5975,
      gold18kEgp: 5121,
      goldCoinEgp: 47800,
      signalType: 'BUY',
      rsi: 58.4
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(goldData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
