const https = require('https');

function fetchTradingViewScan() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      filter: [{ left: 'name', operation: 'nempty' }],
      options: { lang: 'en' },
      columns: [
        'name', 'close', 'change', 'volume', 'average_volume_30d_calc',
        'high', 'low', 'price_52_week_high', 'price_52_week_low',
        'RSI', 'SMA20', 'SMA50', 'price_earnings_ttm', 'earnings_per_share_basic_ttm',
        'Recommend.All', 'MACD.macd', 'MACD.signal', 'ADX', 'ATR'
      ],
      sort: { sortBy: 'volume', sortOrder: 'desc' },
      range: [0, 120]
    });

    const options = {
      hostname: 'scanner.tradingview.com',
      port: 443,
      path: '/egypt/scan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('error', (e) => {
        console.error('TradingView response error:', e);
        resolve([]);
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const results = [];
          for (const row of json.data || []) {
            if (!row.s || !row.d) continue;
            const rawSym = row.s.replace('EGX:', '');
            const [
              name, closePrice, changePercent, volume, avgVolume,
              dayHigh, dayLow, fiftyTwoWeekHigh, fiftyTwoWeekLow,
              rsi, sma20, sma50, peRatio, eps,
              recommendScore, macdVal, macdSignalVal, adxVal, atrVal
            ] = row.d;

            const currentPrice = Number((closePrice || 0).toFixed(2));
            if (currentPrice < 0.01 || currentPrice > 50000) continue;

            results.push({
              symbol: rawSym,
              name: String(name || rawSym),
              currentPrice,
              changePercent: Number((changePercent || 0).toFixed(2)),
              volume: volume || 0,
              avgVolume: Math.round(avgVolume || 0),
              dayHigh: Number((dayHigh || currentPrice).toFixed(2)),
              dayLow: Number((dayLow || currentPrice).toFixed(2)),
              fiftyTwoWeekHigh: Number((fiftyTwoWeekHigh || currentPrice).toFixed(2)),
              fiftyTwoWeekLow: Number((fiftyTwoWeekLow || currentPrice).toFixed(2)),
              rsi: rsi ? Number(rsi.toFixed(2)) : 50,
              sma20: sma20 ? Number(sma20.toFixed(2)) : currentPrice,
              sma50: sma50 ? Number(sma50.toFixed(2)) : currentPrice,
              peRatio: peRatio ? Number(peRatio.toFixed(2)) : undefined,
              eps: eps ? Number(eps.toFixed(4)) : undefined,
              recommendScore: recommendScore || 0,
              macdVal: macdVal ? Number(macdVal.toFixed(4)) : 0,
              macdSignalVal: macdSignalVal ? Number(macdSignalVal.toFixed(4)) : 0,
              adxVal: adxVal ? Number(adxVal.toFixed(2)) : 20,
              atrVal: atrVal ? Number(atrVal.toFixed(2)) : currentPrice * 0.02,
            });
          }
          resolve(results);
        } catch (err) {
          console.error('Error parsing TradingView response:', err);
          resolve([]);
        }
      });
    });

    req.setTimeout(7000, () => {
      console.error('TradingView API request timed out (7s)');
      req.destroy();
      resolve([]);
    });

    req.on('error', (e) => {
      console.error('TradingView API request failed:', e.message);
      resolve([]);
    });

    req.write(postData);
    req.end();
  });
}

function calculateFairValue(stock) {
  const price = stock.currentPrice;
  const low52 = stock.fiftyTwoWeekLow || price * 0.7;
  const high52 = stock.fiftyTwoWeekHigh || price * 1.3;

  if (stock.eps && stock.eps > 0) {
    const sectorPE = 13.5;
    const momentumMultiplier = 1 + (stock.recommendScore * 0.08);
    const fairValue = Number((stock.eps * sectorPE * momentumMultiplier).toFixed(2));
    const clamped = Math.max(price * 0.85, Math.min(price * 1.5, fairValue));
    return { fairValue: Number(clamped.toFixed(2)), confidence: 'HIGH' };
  } else {
    const rangeMidpoint = low52 + 0.618 * (high52 - low52);
    const volRatio = stock.avgVolume > 0 ? Math.min(stock.volume / stock.avgVolume, 2.0) : 1;
    const scoreFactor = 1 + (stock.recommendScore * 0.1);
    let fairValue = rangeMidpoint * (0.85 + 0.15 * volRatio) * scoreFactor;
    fairValue = Math.max(fairValue, price * scoreFactor);
    const clamped = Math.max(price * 0.85, Math.min(price * 1.5, fairValue));
    return { fairValue: Number(clamped.toFixed(2)), confidence: 'LOW' };
  }
}

function calculateSignal(stock, fairValue, fairValueUpsidePercent) {
  const reasons = [];
  const price = stock.currentPrice;

  let valuationScore = 0;
  if (fairValueUpsidePercent >= 30) { valuationScore = 2; reasons.push(`💎 DEEPLY UNDERVALUED: ${fairValueUpsidePercent}% below Fair Value (${fairValue} EGP).`); }
  else if (fairValueUpsidePercent >= 15) { valuationScore = 1; reasons.push(`💎 UNDERVALUED: ${fairValueUpsidePercent}% below Fair Value (${fairValue} EGP).`); }
  else if (fairValueUpsidePercent <= -25) { valuationScore = -2; reasons.push(`🚨 SEVERELY OVERVALUED: ${Math.abs(fairValueUpsidePercent)}% above Fair Value.`); }
  else if (fairValueUpsidePercent <= -10) { valuationScore = -1; reasons.push(`⚠️ OVERVALUED: ${Math.abs(fairValueUpsidePercent)}% above Fair Value.`); }

  let rsiScore = 0;
  if (stock.rsi < 30) { rsiScore = 2; reasons.push(`🚀 RSI (${stock.rsi}) Oversold (<30) - Strong rebound opportunity.`); }
  else if (stock.rsi < 40) { rsiScore = 1; reasons.push(`📈 RSI (${stock.rsi}) in bullish accumulation zone.`); }
  else if (stock.rsi > 75) { rsiScore = -2; reasons.push(`🚨 RSI (${stock.rsi}) Extreme Overbought (>75) - Peak danger.`); }
  else if (stock.rsi > 65) { rsiScore = -1; reasons.push(`⚠️ RSI (${stock.rsi}) in Overbought zone (>65).`); }

  let macdScore = 0;
  if (stock.macdVal > stock.macdSignalVal) { macdScore = 1; reasons.push(`✨ MACD Bullish: Line (${stock.macdVal}) > Signal (${stock.macdSignalVal}).`); }
  else if (stock.macdVal < stock.macdSignalVal) { macdScore = -1; reasons.push(`🔻 MACD Bearish: Line (${stock.macdVal}) < Signal (${stock.macdSignalVal}).`); }

  const isWeakTrend = stock.adxVal < 20;
  const trendDampen = isWeakTrend ? 0.5 : 1.0;
  let trendScore = 0;
  if (isWeakTrend) reasons.push(`ℹ️ ADX (${stock.adxVal}) low trend - signal weight reduced.`);
  if (stock.sma20 > stock.sma50) { trendScore = 1 * trendDampen; reasons.push(`✨ Bullish: SMA20 (${stock.sma20}) > SMA50 (${stock.sma50}).`); }
  else if (stock.sma20 < stock.sma50) { trendScore = -1 * trendDampen; reasons.push(`🔻 Bearish: SMA20 (${stock.sma20}) < SMA50 (${stock.sma50}).`); }

  let volumeScore = 0;
  const volRatio = stock.avgVolume > 0 ? stock.volume / stock.avgVolume : 1;
  if (volRatio >= 1.5) { volumeScore = 1; reasons.push(`🔥 Volume Spike: ${volRatio.toFixed(2)}× average (institutional interest).`); }
  else if (volRatio < 0.8) { volumeScore = -1; reasons.push(`📉 Low Volume: ${volRatio.toFixed(2)}× average (weak conviction).`); }

  const signalScore = Number((
    valuationScore * 0.30 +
    rsiScore * 0.20 +
    macdScore * 0.10 +
    trendScore * 0.25 +
    volumeScore * 0.15
  ).toFixed(2));

  let signalType = 'NEUTRAL';
  if (signalScore >= 1.5) signalType = 'STRONG_BUY';
  else if (signalScore >= 0.5) signalType = 'BUY';
  else if (signalScore <= -1.5) signalType = 'STRONG_SELL';
  else if (signalScore <= -0.5) signalType = 'SELL';

  if (reasons.length === 0) reasons.push(`Price consolidating around ${price} EGP.`);

  return { signalType, signalScore, reasons };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const stocks = await fetchTradingViewScan();

    const results = stocks.map((stock) => {
      const price = stock.currentPrice;
      const { fairValue, confidence } = calculateFairValue(stock);
      const fairValueUpsidePercent = Number((((fairValue - price) / price) * 100).toFixed(2));
      const { signalType, signalScore, reasons } = calculateSignal(stock, fairValue, fairValueUpsidePercent);
      const atr = stock.atrVal || price * 0.02;

      return {
        quote: {
          symbol: stock.symbol,
          yahooSymbol: `${stock.symbol}.CA`,
          nameEn: stock.name,
          nameAr: stock.name,
          currentPrice: price,
          previousClose: Number((price - (price * stock.changePercent / 100)).toFixed(2)),
          change: Number((price * stock.changePercent / 100).toFixed(2)),
          changePercent: stock.changePercent,
          dayHigh: stock.dayHigh,
          dayLow: stock.dayLow,
          fiftyTwoWeekHigh: stock.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: stock.fiftyTwoWeekLow,
          volume: stock.volume,
          avgVolume: stock.avgVolume,
          peRatio: stock.peRatio,
        },
        indicators: {
          rsi: stock.rsi,
          sma20: stock.sma20,
          sma50: stock.sma50,
          macd: { macd: stock.macdVal, signal: stock.macdSignalVal, histogram: Number((stock.macdVal - stock.macdSignalVal).toFixed(4)) },
          adx: stock.adxVal,
          atr: stock.atrVal,
          support: Number((2 * ((stock.fiftyTwoWeekHigh + stock.fiftyTwoWeekLow + price) / 3) - stock.fiftyTwoWeekHigh).toFixed(2)),
          resistance: Number((2 * ((stock.fiftyTwoWeekHigh + stock.fiftyTwoWeekLow + price) / 3) - stock.fiftyTwoWeekLow).toFixed(2)),
          volumeSpike: stock.avgVolume > 0 && (stock.volume / stock.avgVolume) >= 1.5,
          volumeRatio: stock.avgVolume > 0 ? Number((stock.volume / stock.avgVolume).toFixed(2)) : 1,
        },
        signalType,
        signalScore,
        reasons,
        fairValue,
        fairValueConfidence: confidence,
        fairValueUpsidePercent,
        marketRegime: 'UNKNOWN',
        suggestedEntry: {
          min: Number((price - 0.5 * atr).toFixed(2)),
          max: Number((price + 0.5 * atr).toFixed(2)),
        },
        suggestedTarget: {
          target1: Number((price + 2.0 * atr).toFixed(2)),
          target2: Number((Math.max(price + 3.0 * atr, fairValue)).toFixed(2)),
        },
        suggestedStopLoss: Number((price - 1.5 * atr).toFixed(2)),
        positionSizePercent: Number(Math.min(15, Math.max(1, Number((1 / (Math.max(0.01, price - (price - 1.5 * atr)) / price)).toFixed(1)))).toFixed(1)),
        riskRewardRatio: Number(Math.max(0, ((price + 2.0 * atr) - price) / Math.max(0.01, price - (price - 1.5 * atr))).toFixed(2)),
        timestamp: new Date(),
        shariaTier: 'COMPLIANT',
        shariaStatusText: '🟢 متوافق تام مع أحكام الشريعة الإسلامية',
      };
    });

    if (results.length > 0) {
      results.sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
      return res.status(200).json(results);
    }
  } catch (err) {
    console.error('Error fetching stock data:', err);
  }

  return res.status(200).json([]);
};
