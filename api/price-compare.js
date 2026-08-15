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

// 1. Benjamin Graham Model: sqrt(22.5 * EPS * BVPS)
function computeGrahamFV(eps, bvps, price) {
  if (typeof eps !== 'number' || eps <= 0) return undefined;
  const effectiveBvps = (typeof bvps === 'number' && bvps > 0) ? bvps : (price > 0 ? price * 0.7 : undefined);
  if (!effectiveBvps) return undefined;
  const raw = Math.sqrt(22.5 * eps * effectiveBvps);
  if (isNaN(raw) || raw <= 0) return undefined;
  return Number(raw.toFixed(2));
}

// 2. Sector P/E Model: EPS * Sector_PE * Macro_Discount
function computeSectorPeFV(eps, sector, price) {
  if (typeof eps !== 'number' || eps <= 0) return undefined;
  const peMultiplier = SECTOR_PE[sector] || 9.0;
  const macroDiscount = 0.82; // 18% CBE discount
  const raw = eps * peMultiplier * macroDiscount;
  if (isNaN(raw) || raw <= 0) return undefined;
  return Number(raw.toFixed(2));
}

// 3. Peter Lynch Model: EPS * (Growth + Dividend Yield)
function computeLynchFV(eps, dy, price) {
  if (typeof eps !== 'number' || eps <= 0) return undefined;
  const dividendYield = (typeof dy === 'number' && dy > 0) ? dy : 0;
  const multiplier = Math.min(10.0 + dividendYield, 25.0);
  const raw = eps * multiplier;
  if (isNaN(raw) || raw <= 0) return undefined;
  return Number(raw.toFixed(2));
}

// 4. P/B & ROE Model: BVPS * (ROE / Cost_of_Equity)
function computePbRoeFV(bvps, roe, price) {
  const effectiveBvps = (typeof bvps === 'number' && bvps > 0) ? bvps : (price > 0 ? price * 0.7 : undefined);
  if (!effectiveBvps) return undefined;
  const effectiveRoe = (typeof roe === 'number' && roe > 0) ? roe : 15.0;
  const costOfEquity = 20.0; // Benchmark 20% required return in Egypt
  const justifiedPb = Math.min(Math.max(effectiveRoe / costOfEquity, 0.6), 3.5);
  const raw = effectiveBvps * justifiedPb;
  if (isNaN(raw) || raw <= 0) return undefined;
  return Number(raw.toFixed(2));
}

// 5. Consensus Multi-Model Weighted Average
function computeConsensusFV(grahamFv, peFv, lynchFv, pbFv, price) {
  const validModels = [grahamFv, peFv, lynchFv, pbFv].filter(v => typeof v === 'number' && v > 0);
  if (validModels.length > 0) {
    const sum = validModels.reduce((a, b) => a + b, 0);
    return Number((sum / validModels.length).toFixed(2));
  }
  return price > 0 ? Number((price * 1.05).toFixed(2)) : undefined;
}

// Fetch TradingView with rich fundamental & profit metrics
function fetchTradingView() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      symbols: { tickers: [] },
      columns: [
        'name', 'description', 'close', 'change', 'change_abs', 'volume', 'high', 'low', 'open', 'sector',
        'earnings_per_share_basic_ttm', 'price_earnings_ttm', 'price_book_ratio', 'book_value_per_share',
        'dividend_yield_recent', 'return_on_equity',
        'net_income', 'net_margin', 'operating_margin', 'total_revenue'
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

// Fetch Mubasher EGX API
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

// Fetch EGX Beta Market Watch
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

    // Map 1: TradingView Data (Strict)
    const tvMap = new Map();
    for (const item of tvData) {
      if (!item.s || !item.d) continue;
      const sym = item.s.replace('EGX:', '').toUpperCase();
      const [
        name, desc, close, changePercent, changeAbs, volume, high, low, open, sector,
        eps, pe, pb, bvps, dy, roe,
        netIncome, netMargin, operatingMargin, totalRevenue
      ] = item.d;

      if (typeof close === 'number' && close > 0) {
        tvMap.set(sym, {
          price: Number(close.toFixed(2)),
          change: Number((changeAbs || 0).toFixed(2)),
          changePercent: Number((changePercent || 0).toFixed(2)),
          volume: volume || 0,
          dayHigh: Number((high || close).toFixed(2)),
          dayLow: Number((low || close).toFixed(2)),
          open: Number((open || close).toFixed(2)),
          eps: (typeof eps === 'number' && !isNaN(eps)) ? Number(eps.toFixed(2)) : undefined,
          pe: (typeof pe === 'number' && !isNaN(pe) && pe > 0) ? Number(pe.toFixed(2)) : undefined,
          pb: (typeof pb === 'number' && !isNaN(pb) && pb > 0) ? Number(pb.toFixed(2)) : undefined,
          bvps: (typeof bvps === 'number' && !isNaN(bvps) && bvps > 0) ? Number(bvps.toFixed(2)) : (pb && pb > 0 ? Number((close / pb).toFixed(2)) : undefined),
          dy: (typeof dy === 'number' && !isNaN(dy)) ? Number(dy.toFixed(2)) : undefined,
          roe: (typeof roe === 'number' && !isNaN(roe)) ? Number(roe.toFixed(2)) : undefined,
          netIncome: (typeof netIncome === 'number' && !isNaN(netIncome)) ? netIncome : undefined,
          netProfitMargin: (typeof netMargin === 'number' && !isNaN(netMargin)) ? Number(netMargin.toFixed(2)) : undefined,
          grossProfit: (typeof totalRevenue === 'number' && !isNaN(totalRevenue)) ? totalRevenue : undefined,
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

    // Map 2: Mubasher Data (Strict)
    const mubMap = new Map();
    for (const item of mubData) {
      const code = (item.code || item.symbol || '').toUpperCase();
      if (!code) continue;
      const val = parseFloat(item.value || item.lastPrice || item.price);
      if (!isNaN(val) && val > 0) {
        const changeVal = parseFloat(item.change);
        const changePct = parseFloat((item.changePercentage || '').replace('%', ''));
        const volVal = parseInt(String(item.volume || '0').replace(/,/g, ''), 10);
        const highVal = parseFloat(item.high);
        const lowVal = parseFloat(item.low);

        mubMap.set(code, {
          price: val,
          change: !isNaN(changeVal) ? changeVal : 0,
          changePercent: !isNaN(changePct) ? changePct : 0,
          volume: !isNaN(volVal) ? volVal : 0,
          dayHigh: !isNaN(highVal) ? highVal : undefined,
          dayLow: !isNaN(lowVal) ? lowVal : undefined,
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

    // Map 3: EGX Beta Data (Strict)
    const egxMap = new Map();
    for (const item of egxData) {
      const code = (item.reuters || item.isin || item.symbol || item.code || '').replace('.CA', '').toUpperCase();
      if (!code) continue;
      const val = parseFloat(item.closePrice || item.lastPrice || item.price);
      if (!isNaN(val) && val > 0) {
        const changeVal = parseFloat(item.change);
        const changePct = parseFloat(item.chgPer || item.changePercent);
        const volVal = parseInt(String(item.volume || item.tradedVolume || '0').replace(/,/g, ''), 10);
        const highVal = parseFloat(item.highPrice || item.high);
        const lowVal = parseFloat(item.lowPrice || item.low);

        egxMap.set(code, {
          price: val,
          change: !isNaN(changeVal) ? changeVal : 0,
          changePercent: !isNaN(changePct) ? changePct : 0,
          volume: !isNaN(volVal) ? volVal : 0,
          dayHigh: !isNaN(highVal) ? highVal : undefined,
          dayLow: !isNaN(lowVal) ? lowVal : undefined,
          nameAr: item.nameA || item.name || code,
          nameEn: item.nameE || code
        });

        if (!allSymbolsMap.has(code)) {
          allSymbolsMap.set(code, {
            symbol: code,
            nameEn: item.nameE || code,
            nameAr: item.nameA || item.name || code,
            sector: 'General'
          });
        }
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
      const validPrices = [];
      const validConsensusFv = [];
      const validGrahamFv = [];
      const validPeFv = [];
      const validLynchFv = [];
      const validPbFv = [];
      const validUpsides = [];

      // 1. EGX Source (Strict)
      if (egxInfo) {
        const graham = computeGrahamFV(tvInfo?.eps, tvInfo?.bvps, egxInfo.price);
        const peFv = computeSectorPeFV(tvInfo?.eps, sector, egxInfo.price);
        const lynch = computeLynchFV(tvInfo?.eps, tvInfo?.dy, egxInfo.price);
        const pbFv = computePbRoeFV(tvInfo?.bvps, tvInfo?.roe, egxInfo.price);
        const consensusFv = computeConsensusFV(graham, peFv, lynch, pbFv, egxInfo.price);
        const upside = (consensusFv && egxInfo.price > 0) ? Number((((consensusFv - egxInfo.price) / egxInfo.price) * 100).toFixed(2)) : 0;

        sources.egx = {
          price: egxInfo.price,
          change: egxInfo.change,
          changePercent: egxInfo.changePercent,
          volume: egxInfo.volume,
          dayHigh: egxInfo.dayHigh,
          dayLow: egxInfo.dayLow,
          fairValue: consensusFv,
          fairValueGraham: graham,
          fairValuePE: peFv,
          fairValueLynch: lynch,
          fairValuePB: pbFv,
          upsidePercent: upside,
          peRatio: tvInfo?.pe,
          eps: tvInfo?.eps,
          pbRatio: tvInfo?.pb,
          bvps: tvInfo?.bvps,
          roe: tvInfo?.roe,
          dividendYield: tvInfo?.dy,
          netIncome: tvInfo?.netIncome,
          netProfitMargin: tvInfo?.netProfitMargin,
          grossProfit: tvInfo?.grossProfit
        };
        validPrices.push(egxInfo.price);
        if (consensusFv) validConsensusFv.push(consensusFv);
        if (graham) validGrahamFv.push(graham);
        if (peFv) validPeFv.push(peFv);
        if (lynch) validLynchFv.push(lynch);
        if (pbFv) validPbFv.push(pbFv);
        validUpsides.push(upside);
      }

      // 2. TradingView Source (Strict)
      if (tvInfo) {
        const graham = computeGrahamFV(tvInfo.eps, tvInfo.bvps, tvInfo.price);
        const peFv = computeSectorPeFV(tvInfo.eps, sector, tvInfo.price);
        const lynch = computeLynchFV(tvInfo.eps, tvInfo.dy, tvInfo.price);
        const pbFv = computePbRoeFV(tvInfo.bvps, tvInfo.roe, tvInfo.price);
        const consensusFv = computeConsensusFV(graham, peFv, lynch, pbFv, tvInfo.price);
        const upside = (consensusFv && tvInfo.price > 0) ? Number((((consensusFv - tvInfo.price) / tvInfo.price) * 100).toFixed(2)) : 0;

        sources.tradingview = {
          price: tvInfo.price,
          change: tvInfo.change,
          changePercent: tvInfo.changePercent,
          volume: tvInfo.volume,
          dayHigh: tvInfo.dayHigh,
          dayLow: tvInfo.dayLow,
          fairValue: consensusFv,
          fairValueGraham: graham,
          fairValuePE: peFv,
          fairValueLynch: lynch,
          fairValuePB: pbFv,
          upsidePercent: upside,
          peRatio: tvInfo.pe,
          eps: tvInfo.eps,
          pbRatio: tvInfo.pb,
          bvps: tvInfo.bvps,
          roe: tvInfo.roe,
          dividendYield: tvInfo.dy,
          netIncome: tvInfo.netIncome,
          netProfitMargin: tvInfo.netProfitMargin,
          grossProfit: tvInfo.grossProfit
        };
        validPrices.push(tvInfo.price);
        if (consensusFv) validConsensusFv.push(consensusFv);
        if (graham) validGrahamFv.push(graham);
        if (peFv) validPeFv.push(peFv);
        if (lynch) validLynchFv.push(lynch);
        if (pbFv) validPbFv.push(pbFv);
        validUpsides.push(upside);
      }

      // 3. Mubasher Source (Strict)
      if (mubInfo) {
        const graham = computeGrahamFV(tvInfo?.eps, tvInfo?.bvps, mubInfo.price);
        const peFv = computeSectorPeFV(tvInfo?.eps, sector, mubInfo.price);
        const lynch = computeLynchFV(tvInfo?.eps, tvInfo?.dy, mubInfo.price);
        const pbFv = computePbRoeFV(tvInfo?.bvps, tvInfo?.roe, mubInfo.price);
        const consensusFv = computeConsensusFV(graham, peFv, lynch, pbFv, mubInfo.price);
        const upside = (consensusFv && mubInfo.price > 0) ? Number((((consensusFv - mubInfo.price) / mubInfo.price) * 100).toFixed(2)) : 0;

        sources.mubasher = {
          price: mubInfo.price,
          change: mubInfo.change,
          changePercent: mubInfo.changePercent,
          volume: mubInfo.volume,
          dayHigh: mubInfo.dayHigh,
          dayLow: mubInfo.dayLow,
          fairValue: consensusFv,
          fairValueGraham: graham,
          fairValuePE: peFv,
          fairValueLynch: lynch,
          fairValuePB: pbFv,
          upsidePercent: upside,
          peRatio: tvInfo?.pe,
          eps: tvInfo?.eps,
          pbRatio: tvInfo?.pb,
          bvps: tvInfo?.bvps,
          roe: tvInfo?.roe,
          dividendYield: tvInfo?.dy,
          netIncome: tvInfo?.netIncome,
          netProfitMargin: tvInfo?.netProfitMargin,
          grossProfit: tvInfo?.grossProfit
        };
        validPrices.push(mubInfo.price);
        if (consensusFv) validConsensusFv.push(consensusFv);
        if (graham) validGrahamFv.push(graham);
        if (peFv) validPeFv.push(peFv);
        if (lynch) validLynchFv.push(lynch);
        if (pbFv) validPbFv.push(pbFv);
        validUpsides.push(upside);
      }

      // If no valid source returned price for this stock, skip
      if (validPrices.length === 0) continue;

      const sumPrices = validPrices.reduce((a, b) => a + b, 0);
      const avgPrice = Number((sumPrices / validPrices.length).toFixed(2));

      const sortedPrices = [...validPrices].sort((a, b) => a - b);
      const minPrice = sortedPrices[0];
      const maxPrice = sortedPrices[sortedPrices.length - 1];
      const spread = (avgPrice > 0 && validPrices.length > 1) ? Number((((maxPrice - minPrice) / avgPrice) * 100).toFixed(2)) : 0;

      let alignmentStatus = 'SYNCED';
      if (spread > 1.5) alignmentStatus = 'DIVERGENT';
      else if (spread > 0.5) alignmentStatus = 'MINOR_LAG';

      const maxVol = Math.max(
        sources.egx?.volume || 0,
        sources.tradingview?.volume || 0,
        sources.mubasher?.volume || 0
      );

      let highestVolSource = 'tradingview';
      if (sources.egx && sources.egx.volume === maxVol && maxVol > 0) highestVolSource = 'egx';
      else if (sources.mubasher && sources.mubasher.volume === maxVol && maxVol > 0) highestVolSource = 'mubasher';

      const avgConsensusFv = validConsensusFv.length > 0 ? Number((validConsensusFv.reduce((a, b) => a + b, 0) / validConsensusFv.length).toFixed(2)) : avgPrice;
      const avgGrahamFv = validGrahamFv.length > 0 ? Number((validGrahamFv.reduce((a, b) => a + b, 0) / validGrahamFv.length).toFixed(2)) : undefined;
      const avgPeFv = validPeFv.length > 0 ? Number((validPeFv.reduce((a, b) => a + b, 0) / validPeFv.length).toFixed(2)) : undefined;
      const avgLynchFv = validLynchFv.length > 0 ? Number((validLynchFv.reduce((a, b) => a + b, 0) / validLynchFv.length).toFixed(2)) : undefined;
      const avgPbFv = validPbFv.length > 0 ? Number((validPbFv.reduce((a, b) => a + b, 0) / validPbFv.length).toFixed(2)) : undefined;
      const avgUpside = validUpsides.length > 0 ? Number((validUpsides.reduce((a, b) => a + b, 0) / validUpsides.length).toFixed(2)) : 0;

      results.push({
        symbol: sym,
        nameEn,
        nameAr,
        sector,
        yahooSymbol: `${sym}.CA`,
        isHalal: true,
        shariaTier: 'COMPLIANT',
        averagePrice: avgPrice,
        medianPrice: sortedPrices[Math.floor(sortedPrices.length / 2)],
        minPrice,
        maxPrice,
        priceSpreadPercent: spread,
        alignmentStatus,
        highestVolumeSource: highestVolSource,
        maxVolume: maxVol,
        averageFairValue: avgConsensusFv,
        averageFairValueGraham: avgGrahamFv,
        averageFairValuePE: avgPeFv,
        averageFairValueLynch: avgLynchFv,
        averageFairValuePB: avgPbFv,
        averageUpsidePercent: avgUpside,
        averagePeRatio: tvInfo?.pe,
        averageEps: tvInfo?.eps,
        averageNetIncome: tvInfo?.netIncome,
        averageNetProfitMargin: tvInfo?.netProfitMargin,
        averageGrossProfit: tvInfo?.grossProfit,
        sources
      });
    }

    // Sort by maxVolume descending by default
    results.sort((a, b) => b.maxVolume - a.maxVolume);

    res.setHeader('X-Served-By', 'Vercel-MultiModel-FairValuePriceCompare');
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=10');
    return res.status(200).json(results);
  } catch (err) {
    console.error('Error in multi-model price-compare API:', err);
    return res.status(500).json({ error: err.message });
  }
};
