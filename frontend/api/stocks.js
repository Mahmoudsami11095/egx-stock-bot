const https = require('https');

const ISIN_SYMBOL_MAP = {
  'EGS72XL1C014': { symbol: 'PHGC', name: 'بريميوم هيلثكير جروب (PHGC)' },
  'EGS48271C018-EGP': { symbol: 'EGSA', name: 'مصر جنوب أفريقيا للاتصالات (EGSA)' }
};

const CONVENTIONAL_NON_HALAL = new Set([
  'COMI', 'CIEB', 'HDBK', 'EXPA', 'QNBA', 'EAST', 'SUGR', 'EKHO', 'SAIB'
]);

function fetchHttpsJson(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 6000
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

async function fetchHalalSymbolsSet() {
  const json = await fetchHttpsJson('https://stocks.templatesnippet.com/data/stocks.json');
  if (!Array.isArray(json) || json.length === 0) return null;

  const halalSet = new Set();

  for (const item of json) {
    const sym = item.symbol ? item.symbol.toUpperCase() : '';
    if (!sym) continue;

    if (CONVENTIONAL_NON_HALAL.has(sym)) continue;

    const isCoreCompliant = item.core_activity_compliant !== false;
    const loansPercent = item.loans_percentage ?? 0;
    const haramPercent = item.haram_earnings_percentage ?? item.sp_haram_earning_percentage ?? 0;

    if (isCoreCompliant && loansPercent <= 33 && haramPercent <= 5) {
      halalSet.add(sym);
    }
  }

  return halalSet;
}

function fetchTradingViewScan() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      filter: [{ left: 'name', operation: 'nempty' }],
      options: { lang: 'en' },
      columns: [
        'name', 'description', 'close', 'change', 'volume', 'average_volume_30d_calc',
        'high', 'low', 'price_52_week_high', 'price_52_week_low',
        'RSI', 'SMA20', 'SMA50', 'price_earnings_ttm', 'earnings_per_share_basic_ttm',
        'Recommend.All', 'MACD.macd', 'MACD.signal', 'ADX', 'ATR'
      ],
      sort: { sortBy: 'volume', sortOrder: 'desc' },
      range: [0, 350]
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
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const results = [];
          for (const row of json.data || []) {
            if (!row.s || !row.d) continue;
            const rawSym = row.s.replace('EGX:', '');
            const [
              name, description, closePrice, changePercent, volume, avgVolume,
              dayHigh, dayLow, fiftyTwoWeekHigh, fiftyTwoWeekLow,
              rsi, sma20, sma50, peRatio, eps,
              recommendScore, macdVal, macdSignalVal, adxVal, atrVal
            ] = row.d;

            const currentPrice = Number((closePrice || 0).toFixed(2));
            if (currentPrice < 0.01 || currentPrice > 50000) continue;

            let finalSymbol = rawSym;
            let finalName = String(description || name || rawSym);

            if (ISIN_SYMBOL_MAP[rawSym]) {
              finalSymbol = ISIN_SYMBOL_MAP[rawSym].symbol;
              finalName = ISIN_SYMBOL_MAP[rawSym].name;
            } else if (rawSym.startsWith('EGS') && description) {
              finalSymbol = description.split(' ')[0] || rawSym;
              finalName = description;
            }

            results.push({
              rawSym,
              symbol: finalSymbol,
              name: finalName,
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
  }

  const rangeMidpoint = low52 + 0.618 * (high52 - low52);
  const volRatio = stock.avgVolume > 0 ? Math.min(stock.volume / stock.avgVolume, 2.0) : 1;
  const scoreFactor = 1 + (stock.recommendScore * 0.1);
  let fairValue = rangeMidpoint * (0.85 + 0.15 * volRatio) * scoreFactor;
  fairValue = Math.max(fairValue, price * scoreFactor);
  const clamped = Math.max(price * 0.85, Math.min(price * 1.5, fairValue));
  return { fairValue: Number(clamped.toFixed(2)), confidence: 'LOW' };
}

function calculateIntradaySignal(stock) {
  const reasons = [];
  const price = stock.currentPrice;
  let score = 0;

  // 1. Volume Momentum (0 to +3 points) - institutional activity detection
  if (stock.volume > 0 && stock.avgVolume > 0) {
    const volRatio = stock.volume / stock.avgVolume;
    if (volRatio >= 2.0) {
      score += 3;
      reasons.push(`⚡ حجم تداول استثنائي (${volRatio.toFixed(1)}x المتوسط) - نشاط مؤسسي قوي`);
    } else if (volRatio >= 1.5) {
      score += 2;
      reasons.push(`📈 ارتفاع حجم التداول (${volRatio.toFixed(1)}x المتوسط) - زخم متزايد`);
    } else if (volRatio >= 1.2) {
      score += 1;
      reasons.push(`📊 حجم تداول فوق المتوسط (${volRatio.toFixed(1)}x)`);
    }
  }

  // 2. RSI Levels (-2 to +2 points) - overbought/oversold for intraday
  if (stock.rsi < 30) {
    score += 2;
    reasons.push(`🚀 RSI (${stock.rsi}) تشبع بيعي حاد - فرصة ارتداد سريع`);
  } else if (stock.rsi < 40) {
    score += 1;
    reasons.push(`📈 RSI (${stock.rsi}) في منطقة الارتداد الإيجابي`);
  } else if (stock.rsi > 80) {
    score -= 2;
    reasons.push(`🚨 RSI (${stock.rsi}) تشبع شرائي حاد - خطر جني أرباح`);
  } else if (stock.rsi > 70) {
    score -= 1;
    reasons.push(`⚠️ RSI (${stock.rsi}) تشبع شرائي - احترس من التصحيح`);
  }

  // 3. Price position in day range (-1 to +1 points)
  if (stock.dayHigh > stock.dayLow) {
    const dayRange = stock.dayHigh - stock.dayLow;
    const positionFromLow = (price - stock.dayLow) / dayRange; // 0 = at low, 1 = at high
    if (positionFromLow <= 0.25) {
      score += 1;
      reasons.push(`📥 السعر قرب أدنى مستوى اليوم - نقطة دخول منخفضة`);
    } else if (positionFromLow >= 0.75) {
      score -= 1;
      reasons.push(`📤 السعر قرب أعلى مستوى اليوم - مخاطرة شراء مرتفعة`);
    }
  }

  // 4. Today's change momentum (-1 to +1 points)
  if (stock.changePercent >= 3) {
    score += 1;
    reasons.push(`🔥 صعود قوي اليوم (+${stock.changePercent}%) - زخم صاعد`);
  } else if (stock.changePercent <= -3) {
    score -= 1;
    reasons.push(`📉 هبوط قوي اليوم (${stock.changePercent}%) - ضغط بيعي`);
  }

  // 5. MACD crossover (-1 to +1 points)
  if (stock.macdVal > stock.macdSignalVal) {
    score += 1;
    reasons.push(`🟢 MACD تقاطع إيجابي (صاعد)`);
  } else {
    score -= 1;
    reasons.push(`🔴 MACD تقاطع سلبي (هابط)`);
  }

  // 6. Trend vs SMA20 (-1 to +1 points)
  if (price > stock.sma20) {
    score += 1;
    reasons.push(`🐂 السعر فوق SMA20 - اتجاه صاعد داخل الجلسة`);
  } else {
    score -= 1;
    reasons.push(`🐻 السعر تحت SMA20 - اتجاه هابط داخل الجلسة`);
  }

  // Determine intraday signal type
  let intradaySignal = 'NEUTRAL';
  if (score >= 5) intradaySignal = 'STRONG_BUY';
  else if (score >= 2) intradaySignal = 'BUY';
  else if (score <= -5) intradaySignal = 'STRONG_SELL';
  else if (score <= -2) intradaySignal = 'SELL';

  // Calculate intraday entry, target, stop loss based on ATR
  const atrVal = stock.atrVal || price * 0.02;
  const isBuy = score >= 0;

  const intradayEntry = Number(price.toFixed(2));
  const intradayTarget = Number((price + (isBuy ? 1 : -1) * Math.max(atrVal * 1.5, price * 0.02)).toFixed(2));
  const intradayStopLoss = Number((price + (isBuy ? -1 : 1) * Math.max(atrVal, price * 0.015)).toFixed(2));

  return {
    intradaySignal,
    intradayScore: score,
    intradayReasons: reasons,
    intradayEntry,
    intradayTarget,
    intradayStopLoss
  };
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
  if (stock.macdVal > stock.macdSignalVal) { macdScore = 1; reasons.push(`🟢 MACD Bullish Crossover (MACD > Signal).`); }
  else { macdScore = -1; reasons.push(`🔴 MACD Bearish Alignment.`); }

  let trendScore = 0;
  if (price > stock.sma20 && stock.sma20 > stock.sma50) { trendScore = 1; reasons.push(`🐂 Bullish Trend: Price > SMA20 > SMA50.`); }
  else if (price < stock.sma20 && stock.sma20 < stock.sma50) { trendScore = -1; reasons.push(`🐻 Bearish Trend: Price < SMA20 < SMA50.`); }

  const totalScore = Number((0.35 * valuationScore + 0.25 * rsiScore + 0.20 * macdScore + 0.20 * trendScore).toFixed(2));
  let signalType = 'NEUTRAL';
  if (totalScore >= 0.4) signalType = 'BUY';
  else if (totalScore <= -0.4) signalType = 'SELL';

  const entryMin = Number((price * 0.99).toFixed(2));
  const entryMax = Number((price * 1.01).toFixed(2));

  return {
    signalType,
    signalScore: totalScore,
    reasons,
    suggestedEntry: { min: entryMin, max: entryMax },
    suggestedTarget1: Number(Math.max(price * 1.05, Math.min(fairValue, price * 1.15)).toFixed(2)),
    suggestedTarget2: fairValue,
    suggestedStopLoss: Number((price * 0.95).toFixed(2)),
    positionSizePercent: signalType === 'BUY' ? 12 : 5,
    riskRewardRatio: Number((((fairValue - price) / (price * 0.05)) || 1.5).toFixed(2))
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const [stocks, halalSet] = await Promise.all([
      fetchTradingViewScan(),
      fetchHalalSymbolsSet()
    ]);

    const processed = [];

    for (const s of stocks) {
      const symUpper = s.symbol.toUpperCase();
      const rawUpper = (s.rawSym || '').toUpperCase();

      if (CONVENTIONAL_NON_HALAL.has(symUpper) || CONVENTIONAL_NON_HALAL.has(rawUpper)) {
        continue;
      }

      if (halalSet && !halalSet.has(symUpper) && !halalSet.has(rawUpper)) {
        continue;
      }

      const { fairValue, confidence } = calculateFairValue(s);
      const upsidePercent = Number((((fairValue - s.currentPrice) / s.currentPrice) * 100).toFixed(2));
      const signalData = calculateSignal(s, fairValue, upsidePercent);
      const intradayData = calculateIntradaySignal(s);

      processed.push({
        symbol: s.symbol,
        name: s.name,
        currentPrice: s.currentPrice,
        changePercent: s.changePercent,
        volume: s.volume,
        avgVolume: s.avgVolume,
        dayHigh: s.dayHigh,
        dayLow: s.dayLow,
        fiftyTwoWeekHigh: s.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: s.fiftyTwoWeekLow,
        rsi: s.rsi,
        sma20: s.sma20,
        sma50: s.sma50,
        peRatio: s.peRatio,
        eps: s.eps,
        macdVal: s.macdVal,
        macdSignalVal: s.macdSignalVal,
        adxVal: s.adxVal,
        atrVal: s.atrVal,
        fairValue,
        fairValueConfidence: confidence,
        fairValueUpsidePercent: upsidePercent,
        isHalal: true,
        ...signalData,
        ...intradayData,
        quote: {
          symbol: s.symbol,
          nameEn: s.name,
          nameAr: s.name,
          currentPrice: s.currentPrice,
          previousClose: Number((s.currentPrice / (1 + s.changePercent / 100)).toFixed(2)),
          change: Number((s.currentPrice * (s.changePercent / 100)).toFixed(2)),
          changePercent: s.changePercent,
          dayHigh: s.dayHigh,
          dayLow: s.dayLow,
          fiftyTwoWeekHigh: s.fiftyTwoWeekHigh,
          fiftyTwoWeekLow: s.fiftyTwoWeekLow,
          volume: s.volume,
          avgVolume: s.avgVolume,
          peRatio: s.peRatio
        },
        indicators: {
          rsi: s.rsi,
          sma20: s.sma20,
          sma50: s.sma50,
          support: Number((s.currentPrice * 0.96).toFixed(2)),
          resistance: Number((s.currentPrice * 1.05).toFixed(2)),
          volumeSpike: s.volume > s.avgVolume * 1.5,
          volumeRatio: s.avgVolume > 0 ? Number((s.volume / s.avgVolume).toFixed(2)) : 1
        },
        suggestedTarget: {
          target1: signalData.suggestedTarget1,
          target2: signalData.suggestedTarget2
        },
        shariaTier: 'COMPLIANT',
        shariaStatusText: '🟢 متوافق مع أحكام الشريعة الإسلامية'
      });
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(processed);
  } catch (err) {
    console.error('Error fetching EGX stocks:', err);
    return res.status(500).json({ error: 'Failed to fetch EGX stocks' });
  }
};
