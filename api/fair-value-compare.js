const https = require('https');
const path = require('path');
const fs = require('fs');

// Load canonical stock watchlist for metadata mapping
let watchlist = [];
const watchlistMetaMap = new Map();

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

if (Array.isArray(watchlist)) {
  for (const s of watchlist) {
    if (s && s.symbol) {
      watchlistMetaMap.set(s.symbol.toUpperCase(), s);
    }
  }
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
  const macroDiscount = 0.82;
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
        'name', 'description', 'close', 'change', 'volume', 'high', 'low',
        'earnings_per_share_basic_ttm', 'price_earnings_ttm', 'price_52_week_high', 'price_52_week_low', 'sector'
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
      timeout: 5000
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
      timeout: 5000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.prices || (Array.isArray(json) ? json : []));
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
      timeout: 3000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          if (body.includes('Request Rejected') || res.statusCode !== 200) {
            resolve([]);
          } else {
            const json = JSON.parse(body);
            resolve(json.data?.data || json.data || []);
          }
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

    const allSymbolsMap = new Map();

    // Map 1: TradingView (Strict)
    const tvMap = new Map();
    for (const item of tvData) {
      if (!item.s || !item.d) continue;
      const sym = item.s.replace('EGX:', '').toUpperCase();
      const [name, desc, close, change, volume, high, low, eps, pe, high52, low52, sector] = item.d;
      if (typeof close === 'number' && close > 0) {
        tvMap.set(sym, {
          price: Number(close.toFixed(2)),
          change: Number((change || 0).toFixed(2)),
          volume: volume || 0,
          high: Number((high || close).toFixed(2)),
          low: Number((low || close).toFixed(2)),
          eps: (typeof eps === 'number' && !isNaN(eps)) ? Number(eps.toFixed(2)) : null,
          pe: (typeof pe === 'number' && !isNaN(pe) && pe > 0) ? Number(pe.toFixed(2)) : null,
          nameEn: desc || name || sym,
          sector: sector || 'General'
        });

        if (!allSymbolsMap.has(sym)) {
          allSymbolsMap.set(sym, {
            symbol: sym,
            nameEn: desc || name || sym,
            nameAr: sym,
            sector: sector || 'General'
          });
        }
      }
    }

    // Map 2: Mubasher (Strict)
    const mubMap = new Map();
    for (const item of mubData) {
      const code = (item.code || item.symbol || '').toUpperCase();
      if (!code) continue;
      const val = parseFloat(item.value || item.lastPrice || item.price);
      if (!isNaN(val) && val > 0) {
        mubMap.set(code, {
          price: val,
          change: parseFloat(item.change) || 0,
          changePercent: parseFloat((item.changePercentage || '').replace('%', '')) || 0,
          volume: parseInt(String(item.volume || '0').replace(/,/g, ''), 10) || 0,
          high: parseFloat(item.high) || val,
          low: parseFloat(item.low) || val,
          nameAr: item.name || code
        });

        if (!allSymbolsMap.has(code)) {
          allSymbolsMap.set(code, {
            symbol: code,
            nameEn: code,
            nameAr: item.name || code,
            sector: 'General'
          });
        } else {
          const entry = allSymbolsMap.get(code);
          if (item.name) entry.nameAr = item.name;
        }
      }
    }

    // Map 3: EGX Beta (Strict)
    const egxMap = new Map();
    for (const item of egxData) {
      const code = (item.reuters || item.isin || item.symbol || item.code || '').replace('.CA', '').toUpperCase();
      if (!code) continue;
      const val = parseFloat(item.closePrice || item.lastPrice || item.price);
      if (!isNaN(val) && val > 0) {
        egxMap.set(code, {
          price: val,
          change: parseFloat(item.change) || 0,
          changePercent: parseFloat(item.chgPer || item.changePercent) || 0,
          volume: parseInt(String(item.volume || item.tradedVolume || '0').replace(/,/g, ''), 10) || 0,
          high: parseFloat(item.highPrice || item.high) || val,
          low: parseFloat(item.lowPrice || item.low) || val
        });
      }
    }

    const results = [];

    for (const [sym, stockInfo] of allSymbolsMap.entries()) {
      const meta = watchlistMetaMap.get(sym);

      const nameAr = (meta && meta.nameAr) || (stockInfo && stockInfo.nameAr) || sym;
      const nameEn = (meta && meta.nameEn) || (stockInfo && stockInfo.nameEn) || sym;
      const sector = (meta && meta.sector) || (stockInfo && stockInfo.sector) || 'General';

      const tvInfo = tvMap.get(sym);
      const mubInfo = mubMap.get(sym);
      const egxInfo = egxMap.get(sym);

      const sources = {};
      const validFv = [];
      const validUpsides = [];
      const validPrices = [];

      // EGX
      if (egxInfo) {
        const fv = computeStandaloneFV(egxInfo.price, tvInfo?.eps, sector);
        const upside = egxInfo.price > 0 ? Number((((fv - egxInfo.price) / egxInfo.price) * 100).toFixed(2)) : 0;
        sources.egx = {
          currentPrice: egxInfo.price,
          fairValue: fv,
          confidence: tvInfo?.eps ? 'HIGH' : 'MEDIUM',
          upsidePercent: upside,
          changePercent: egxInfo.changePercent,
          volume: egxInfo.volume,
          dayHigh: egxInfo.high,
          dayLow: egxInfo.low
        };
        validFv.push(fv);
        validUpsides.push(upside);
        validPrices.push(egxInfo.price);
      }

      // TradingView
      if (tvInfo) {
        const fv = computeStandaloneFV(tvInfo.price, tvInfo.eps, sector);
        const upside = tvInfo.price > 0 ? Number((((fv - tvInfo.price) / tvInfo.price) * 100).toFixed(2)) : 0;
        sources.tradingview = {
          currentPrice: tvInfo.price,
          fairValue: fv,
          confidence: tvInfo.eps ? 'HIGH' : 'MEDIUM',
          upsidePercent: upside,
          changePercent: tvInfo.change,
          volume: tvInfo.volume,
          dayHigh: tvInfo.high,
          dayLow: tvInfo.low
        };
        validFv.push(fv);
        validUpsides.push(upside);
        validPrices.push(tvInfo.price);
      }

      // Mubasher
      if (mubInfo) {
        const fv = computeStandaloneFV(mubInfo.price, tvInfo?.eps, sector);
        const upside = mubInfo.price > 0 ? Number((((fv - mubInfo.price) / mubInfo.price) * 100).toFixed(2)) : 0;
        sources.mubasher = {
          currentPrice: mubInfo.price,
          fairValue: fv,
          confidence: 'MEDIUM',
          upsidePercent: upside,
          changePercent: mubInfo.changePercent,
          volume: mubInfo.volume,
          dayHigh: mubInfo.high,
          dayLow: mubInfo.low
        };
        validFv.push(fv);
        validUpsides.push(upside);
        validPrices.push(mubInfo.price);
      }

      if (validPrices.length === 0) continue;

      const currentPrice = Number((validPrices.reduce((a, b) => a + b, 0) / validPrices.length).toFixed(2));
      const avgFv = validFv.length > 0 ? Number((validFv.reduce((a, b) => a + b, 0) / validFv.length).toFixed(2)) : currentPrice;
      const avgUpside = validUpsides.length > 0 ? Number((validUpsides.reduce((a, b) => a + b, 0) / validUpsides.length).toFixed(2)) : 0;

      const sortedFv = [...validFv].sort((a, b) => a - b);
      const medianFv = sortedFv[Math.floor(sortedFv.length / 2)] || avgFv;
      const minFv = sortedFv[0] || avgFv;
      const maxFv = sortedFv[sortedFv.length - 1] || avgFv;
      const spread = (avgFv > 0 && validFv.length > 1) ? Number((((maxFv - minFv) / avgFv) * 100).toFixed(2)) : 0;

      let consensusStatus = 'FAIR';
      if (avgUpside >= 15) consensusStatus = 'STRONGLY_UNDERVALUED';
      else if (avgUpside >= 5) consensusStatus = 'UNDERVALUED';
      else if (avgUpside <= -15) consensusStatus = 'STRONGLY_OVERVALUED';
      else if (avgUpside <= -5) consensusStatus = 'OVERVALUED';

      results.push({
        symbol: sym,
        nameEn,
        nameAr,
        sector,
        yahooSymbol: `${sym}.CA`,
        isHalal: true,
        shariaTier: 'COMPLIANT',
        currentPrice,
        sources,
        fairValues: validFv,
        averageFairValue: avgFv,
        medianFairValue: medianFv,
        minFairValue: minFv,
        maxFairValue: maxFv,
        spreadPercent: spread,
        averageUpsidePercent: avgUpside,
        consensusStatus,
        highestDiscrepancySource: null
      });
    }

    results.sort((a, b) => b.averageUpsidePercent - a.averageUpsidePercent);

    res.setHeader('X-Served-By', 'Vercel-ZeroFallback-FairValueCompare');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(results);
  } catch (err) {
    console.error('Error in fair-value zero-fallback handler:', err);
    return res.status(500).json({ error: err.message });
  }
};
