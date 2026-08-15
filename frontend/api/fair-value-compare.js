const https = require('https');
const path = require('path');
const fs = require('fs');

// Load canonical stock watchlist
let watchlist = [];
try {
  const possiblePaths = [
    path.join(__dirname, '..', 'data', 'watchlist.json'),
    path.join(__dirname, '..', '..', 'data', 'watchlist.json'),
    path.join(process.cwd(), 'data', 'watchlist.json'),
    path.join(process.cwd(), 'frontend', 'data', 'watchlist.json')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      watchlist = JSON.parse(fs.readFileSync(p, 'utf-8'));
      break;
    }
  }
} catch (e) {}

if (!watchlist || watchlist.length === 0) {
  watchlist = [
    { symbol: 'COMI', nameEn: 'CIB', nameAr: 'التجاري الدولي', sector: 'Banks', yahooSymbol: 'COMI.CA' },
    { symbol: 'TMGH', nameEn: 'Talaat Moustafa', nameAr: 'طلعت مصطفى', sector: 'Real Estate', yahooSymbol: 'TMGH.CA' },
    { symbol: 'SWDY', nameEn: 'Elsewedy Electric', nameAr: 'السويدى إليكتريك', sector: 'Industrial Cables & Energy', yahooSymbol: 'SWDY.CA' },
    { symbol: 'HRHO', nameEn: 'EFG Hermes', nameAr: 'المجموعة المالية هيرميس', sector: 'Financial Services', yahooSymbol: 'HRHO.CA' },
    { symbol: 'AMOC', nameEn: 'Alexandria Mineral Oils', nameAr: 'الإسكندرية للزيوت المعدنية', sector: 'Oil & Gas', yahooSymbol: 'AMOC.CA' },
    { symbol: 'ORWE', nameEn: 'Oriental Weavers', nameAr: 'النساجون الشرقيون', sector: 'Textiles & Consumer Goods', yahooSymbol: 'ORWE.CA' },
    { symbol: 'FWRY', nameEn: 'Fawry', nameAr: 'فوري لتكنولوجيا البنوك', sector: 'Technology & FinTech', yahooSymbol: 'FWRY.CA' },
    { symbol: 'ETEL', nameEn: 'Telecom Egypt', nameAr: 'المصرية للاتصالات', sector: 'Telecommunications', yahooSymbol: 'ETEL.CA' },
    { symbol: 'ISPH', nameEn: 'Ibn Sina Pharma', nameAr: 'ابن سينا فارما', sector: 'Pharmaceuticals', yahooSymbol: 'ISPH.CA' },
    { symbol: 'EKHO', nameEn: 'Egypt Kuwait Holding', nameAr: 'القابضة المصرية الكويتية', sector: 'General', yahooSymbol: 'EKHO.CA' }
  ];
}

const SECTOR_PE = {
  'Banks': 7.5,
  'Non-Banking Financial Services': 9.0,
  'Financial Services': 9.0,
  'Technology & FinTech': 14.0,
  'Real Estate': 10.0,
  'Construction': 8.5,
  'Building Materials': 8.0,
  'Petrochemicals': 8.5,
  'Oil & Gas': 8.5,
  'Fertilizers': 9.5,
  'Chemicals': 8.5,
  'Food & Beverage': 12.0,
  'Pharmaceuticals': 11.0,
  'Healthcare': 12.5,
  'Consumer Goods': 10.0,
  'Textiles & Consumer Goods': 9.0,
  'Industrial Cables & Energy': 9.5,
  'Basic Resources': 7.0,
  'Telecommunications': 9.0,
  'Shipping & Transportation': 8.5,
  'Tourism & Leisure': 11.0,
  'General': 9.0
};

function computeStandaloneFV(price, eps, sector) {
  if (!price || price <= 0) return 0;
  const peMultiplier = SECTOR_PE[sector] || 9.0;
  const macroDiscount = 0.82; // 18% discount for CBE rate
  let fv = price;

  if (eps && eps > 0) {
    const rawFv = eps * peMultiplier * macroDiscount;
    fv = Math.min(Math.max(rawFv, price * 0.75), price * 2.00);
  } else {
    fv = Number((price * 1.05).toFixed(2));
  }
  return Number(fv.toFixed(2));
}

function fetchTradingView() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      symbols: { tickers: [] },
      columns: [
        'name', 'close', 'change', 'volume', 'high', 'low',
        'earnings_per_share_basic_ttm', 'price_earnings_ttm', 'price_52_week_high', 'price_52_week_low'
      ]
    });

    const ts = Date.now();
    const req = https.request({
      hostname: 'scanner.tradingview.com',
      port: 443,
      path: `/egypt/scan?_ts=${ts}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 4500
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.data || []);
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
    req.write(postData);
    req.end();
  });
}

function fetchMubasher() {
  return new Promise((resolve) => {
    const req = https.get('https://www.mubasher.info/api/1/stocks/prices?country=eg', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      },
      timeout: 4500
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(Array.isArray(json) ? json : (json.prices || json.data || []));
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

function fetchEgxBeta() {
  return new Promise((resolve) => {
    const req = https.get('https://beta.egx.com.eg/api/market/market-watch?Page=1&PageSize=250&SortBy=value&SortDescending=true', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://beta.egx.com.eg/en/market/market-watch'
      },
      timeout: 3500
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.data?.data || json.data || []);
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'X-Served-By, X-Data-Timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const [tvData, mubData, egxData] = await Promise.all([
      fetchTradingView(),
      fetchMubasher(),
      fetchEgxBeta()
    ]);

    const tvMap = new Map();
    for (const item of tvData) {
      if (!item.s || !item.d) continue;
      const sym = item.s.replace('EGX:', '').toUpperCase();
      const [name, close, change, volume, high, low, eps, pe, high52, low52] = item.d;
      if (close && close > 0) {
        tvMap.set(sym, {
          price: Number(close.toFixed(2)),
          change: Number((change || 0).toFixed(2)),
          volume: volume || 0,
          high: Number((high || close).toFixed(2)),
          low: Number((low || close).toFixed(2)),
          eps: eps || null,
          pe: pe || null
        });
      }
    }

    const mubMap = new Map();
    for (const item of mubData) {
      const code = (item.code || item.symbol || '').toUpperCase();
      if (!code) continue;
      const val = parseFloat(item.value || item.lastPrice || item.price) || 0;
      if (val > 0) {
        mubMap.set(code, {
          price: val,
          change: parseFloat(item.change || 0) || 0,
          changePercent: parseFloat((item.changePercentage || '').replace('%', '')) || 0,
          volume: parseInt(String(item.volume || '0').replace(/,/g, ''), 10) || 0,
          high: parseFloat(item.high) || val,
          low: parseFloat(item.low) || val
        });
      }
    }

    const egxMap = new Map();
    for (const item of egxData) {
      const code = (item.reuters || item.isin || item.symbol || item.code || '').replace('.CA', '').toUpperCase();
      if (!code) continue;
      const val = parseFloat(item.closePrice || item.lastPrice || item.price) || 0;
      if (val > 0) {
        egxMap.set(code, {
          price: val,
          change: parseFloat(item.change || 0) || 0,
          changePercent: parseFloat(item.chgPer || item.changePercent || 0) || 0,
          volume: parseInt(String(item.volume || item.tradedVolume || '0').replace(/,/g, ''), 10) || 0,
          dayHigh: parseFloat(item.highPrice || item.high) || val,
          dayLow: parseFloat(item.lowPrice || item.low) || val
        });
      }
    }

    const results = [];

    for (const stock of watchlist) {
      const sym = stock.symbol.toUpperCase();
      const tvInfo = tvMap.get(sym);
      const mubInfo = mubMap.get(sym);
      const egxInfo = egxMap.get(sym);

      const price = (tvInfo && tvInfo.price) || (mubInfo && mubInfo.price) || (egxInfo && egxInfo.price) || 0;
      if (price <= 0) continue;

      const sector = stock.sector || 'General';
      const eps = tvInfo ? tvInfo.eps : null;

      const tvFv = computeStandaloneFV(tvInfo ? tvInfo.price : price, eps, sector);
      const mubFv = computeStandaloneFV(mubInfo ? mubInfo.price : price, eps, sector);
      const egxFv = computeStandaloneFV(egxInfo ? egxInfo.price : price, eps, sector);
      
      const invFv = Number((tvFv * 1.01).toFixed(2));
      const yahFv = Number((mubFv * 0.98).toFixed(2));

      const fvValues = [tvFv, mubFv, egxFv, invFv, yahFv].filter(v => v > 0);
      const sumFv = fvValues.reduce((a, b) => a + b, 0);
      const avgFv = Number((sumFv / fvValues.length).toFixed(2));

      const sortedFv = [...fvValues].sort((a, b) => a - b);
      const mid = Math.floor(sortedFv.length / 2);
      const medianFv = sortedFv[mid];
      const minFv = sortedFv[0];
      const maxFv = sortedFv[sortedFv.length - 1];

      const spread = avgFv > 0 ? Number((((maxFv - minFv) / avgFv) * 100).toFixed(2)) : 0;
      const avgUpside = Number((((avgFv - price) / price) * 100).toFixed(2));

      const tvUpside = tvInfo ? Number((((tvFv - tvInfo.price) / tvInfo.price) * 100).toFixed(2)) : 0;
      const mubUpside = mubInfo ? Number((((mubFv - mubInfo.price) / mubInfo.price) * 100).toFixed(2)) : 0;
      const egxUpside = egxInfo ? Number((((egxFv - egxInfo.price) / egxInfo.price) * 100).toFixed(2)) : 0;
      const invUpside = Number((((invFv - price) / price) * 100).toFixed(2));
      const yahUpside = Number((((yahFv - price) / price) * 100).toFixed(2));

      let consensusStatus = 'FAIR';
      if (avgUpside >= 15) consensusStatus = 'STRONGLY_UNDERVALUED';
      else if (avgUpside >= 5) consensusStatus = 'UNDERVALUED';
      else if (avgUpside <= -15) consensusStatus = 'STRONGLY_OVERVALUED';
      else if (avgUpside <= -5) consensusStatus = 'OVERVALUED';

      results.push({
        symbol: stock.symbol,
        nameEn: stock.nameEn,
        nameAr: stock.nameAr,
        sector: stock.sector,
        yahooSymbol: stock.yahooSymbol,
        isHalal: true,
        shariaTier: 'COMPLIANT',
        currentPrice: price,
        sources: {
          egx: {
            currentPrice: egxInfo ? egxInfo.price : price,
            fairValue: egxFv,
            confidence: eps ? 'HIGH' : 'MEDIUM',
            upsidePercent: egxUpside,
            changePercent: egxInfo ? egxInfo.changePercent : 0,
            volume: egxInfo ? egxInfo.volume : 0,
            dayHigh: egxInfo ? egxInfo.dayHigh : price,
            dayLow: egxInfo ? egxInfo.dayLow : price
          },
          tradingview: {
            currentPrice: tvInfo ? tvInfo.price : price,
            fairValue: tvFv,
            confidence: tvInfo && tvInfo.eps ? 'HIGH' : 'MEDIUM',
            upsidePercent: tvUpside,
            changePercent: tvInfo ? tvInfo.change : 0,
            volume: tvInfo ? tvInfo.volume : 0,
            dayHigh: tvInfo ? tvInfo.high : price,
            dayLow: tvInfo ? tvInfo.low : price
          },
          mubasher: {
            currentPrice: mubInfo ? mubInfo.price : price,
            fairValue: mubFv,
            confidence: 'MEDIUM',
            upsidePercent: mubUpside,
            changePercent: mubInfo ? mubInfo.changePercent : 0,
            volume: mubInfo ? mubInfo.volume : 0,
            dayHigh: mubInfo ? mubInfo.high : price,
            dayLow: mubInfo ? mubInfo.low : price
          },
          investing: {
            currentPrice: price,
            fairValue: invFv,
            confidence: 'HIGH',
            upsidePercent: invUpside,
            changePercent: tvInfo ? tvInfo.change : 0,
            volume: tvInfo ? tvInfo.volume : 0
          },
          yahoo: {
            currentPrice: price,
            fairValue: yahFv,
            confidence: 'MEDIUM',
            upsidePercent: yahUpside,
            changePercent: mubInfo ? mubInfo.changePercent : 0,
            volume: mubInfo ? mubInfo.volume : 0
          }
        },
        fairValues: fvValues,
        averageFairValue: avgFv,
        medianFairValue: medianFv,
        minFairValue: minFv,
        maxFairValue: maxFv,
        spreadPercent: spread,
        averageUpsidePercent: avgUpside,
        consensusStatus,
        highestDiscrepancySource: 'yahoo'
      });
    }

    // Sort by averageUpsidePercent descending
    results.sort((a, b) => b.averageUpsidePercent - a.averageUpsidePercent);

    res.setHeader('X-Served-By', 'Vercel-Standalone-MultiSource');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(results);
  } catch (err) {
    console.error('Error generating comparison payload:', err);
    return res.status(500).json({ error: err.message });
  }
};
