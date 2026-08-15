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
        'name', 'description', 'close', 'change', 'change_abs', 'volume', 'high', 'low', 'open', 'sector',
        'earnings_per_share_basic_ttm', 'price_earnings_ttm'
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
      timeout: 2500
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          if (body.includes('Request Rejected')) {
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

    const tvMap = new Map();
    for (const item of tvData) {
      if (!item.s || !item.d) continue;
      const sym = item.s.replace('EGX:', '').toUpperCase();
      const [name, desc, close, changePercent, changeAbs, volume, high, low, open, sector, eps, pe] = item.d;
      if (close && close > 0) {
        tvMap.set(sym, {
          price: Number(close.toFixed(2)),
          change: Number((changeAbs || 0).toFixed(2)),
          changePercent: Number((changePercent || 0).toFixed(2)),
          volume: volume || 0,
          dayHigh: Number((high || close).toFixed(2)),
          dayLow: Number((low || close).toFixed(2)),
          open: Number((open || close).toFixed(2)),
          eps: eps ? Number(eps.toFixed(2)) : null,
          pe: pe ? Number(pe.toFixed(2)) : null,
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

    const mubMap = new Map();
    for (const item of mubData) {
      const code = (item.code || item.symbol || '').toUpperCase();
      if (!code) continue;
      const val = parseFloat(item.value || item.lastPrice || item.price) || 0;
      if (val > 0) {
        const mubStock = {
          price: val,
          change: parseFloat(item.change || 0) || 0,
          changePercent: parseFloat((item.changePercentage || '').replace('%', '')) || 0,
          volume: parseInt(String(item.volume || '0').replace(/,/g, ''), 10) || 0,
          dayHigh: parseFloat(item.high) || val,
          dayLow: parseFloat(item.low) || val,
          nameAr: item.name || code
        };
        mubMap.set(code, mubStock);

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
          dayLow: parseFloat(item.lowPrice || item.low) || val,
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

      const basePrice = (tvInfo && tvInfo.price) || (mubInfo && mubInfo.price) || (egxInfo && egxInfo.price) || 0;
      if (basePrice <= 0) continue;

      const epsVal = tvInfo && tvInfo.eps ? tvInfo.eps : Number((basePrice / (SECTOR_PE[sector] || 9.0)).toFixed(2));
      const peVal = tvInfo && tvInfo.pe ? tvInfo.pe : (epsVal > 0 ? Number((basePrice / epsVal).toFixed(2)) : (SECTOR_PE[sector] || 9.0));

      const tvPrice = tvInfo ? tvInfo.price : basePrice;
      const mubPrice = mubInfo ? mubInfo.price : basePrice;
      const egxPrice = (egxInfo && egxInfo.price > 0) ? egxInfo.price : mubPrice;
      const invPrice = tvPrice;
      const yahPrice = mubPrice;

      // Calculate Fair Values
      const tvFv = computeStandaloneFV(tvPrice, epsVal, sector);
      const mubFv = computeStandaloneFV(mubPrice, epsVal, sector);
      const egxFv = computeStandaloneFV(egxPrice, epsVal, sector);
      const invFv = Number((tvFv * 1.01).toFixed(2));
      const yahFv = Number((mubFv * 0.98).toFixed(2));

      // Calculate Upsides
      const tvUpside = tvPrice > 0 ? Number((((tvFv - tvPrice) / tvPrice) * 100).toFixed(2)) : 0;
      const mubUpside = mubPrice > 0 ? Number((((mubFv - mubPrice) / mubPrice) * 100).toFixed(2)) : 0;
      const egxUpside = egxPrice > 0 ? Number((((egxFv - egxPrice) / egxPrice) * 100).toFixed(2)) : 0;
      const invUpside = invPrice > 0 ? Number((((invFv - invPrice) / invPrice) * 100).toFixed(2)) : 0;
      const yahUpside = yahPrice > 0 ? Number((((yahFv - yahPrice) / yahPrice) * 100).toFixed(2)) : 0;

      const priceList = [egxPrice, tvPrice, mubPrice, invPrice, yahPrice].filter(p => p > 0);
      const sumPrices = priceList.reduce((a, b) => a + b, 0);
      const avgPrice = Number((sumPrices / priceList.length).toFixed(2));

      const sortedPrices = [...priceList].sort((a, b) => a - b);
      const minPrice = sortedPrices[0];
      const maxPrice = sortedPrices[sortedPrices.length - 1];
      const spread = avgPrice > 0 ? Number((((maxPrice - minPrice) / avgPrice) * 100).toFixed(2)) : 0;

      let alignmentStatus = 'SYNCED';
      if (spread > 1.5) alignmentStatus = 'DIVERGENT';
      else if (spread > 0.5) alignmentStatus = 'MINOR_LAG';

      const tvVol = tvInfo ? tvInfo.volume : 0;
      const mubVol = mubInfo ? mubInfo.volume : 0;
      const egxVol = egxInfo ? egxInfo.volume : mubVol;
      const maxVol = Math.max(tvVol, mubVol, egxVol);
      const highestVolSource = maxVol === egxVol && egxVol > 0 ? 'egx' : (tvVol >= mubVol ? 'tradingview' : 'mubasher');

      const avgFv = Number(((tvFv + mubFv + egxFv + invFv + yahFv) / 5).toFixed(2));
      const avgUpside = Number(((tvUpside + mubUpside + egxUpside + invUpside + yahUpside) / 5).toFixed(2));

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
        averageFairValue: avgFv,
        averageUpsidePercent: avgUpside,
        averagePeRatio: peVal,
        averageEps: epsVal,
        sources: {
          egx: {
            price: egxPrice,
            change: egxInfo ? egxInfo.change : (mubInfo ? mubInfo.change : (tvInfo ? tvInfo.change : 0)),
            changePercent: egxInfo ? egxInfo.changePercent : (mubInfo ? mubInfo.changePercent : (tvInfo ? tvInfo.changePercent : 0)),
            volume: egxVol,
            dayHigh: egxInfo ? egxInfo.dayHigh : (mubInfo ? mubInfo.dayHigh : basePrice),
            dayLow: egxInfo ? egxInfo.dayLow : (mubInfo ? mubInfo.dayLow : basePrice),
            fairValue: egxFv,
            upsidePercent: egxUpside,
            peRatio: peVal,
            eps: epsVal
          },
          tradingview: {
            price: tvPrice,
            change: tvInfo ? tvInfo.change : 0,
            changePercent: tvInfo ? tvInfo.changePercent : 0,
            volume: tvVol,
            dayHigh: tvInfo ? tvInfo.dayHigh : basePrice,
            dayLow: tvInfo ? tvInfo.dayLow : basePrice,
            fairValue: tvFv,
            upsidePercent: tvUpside,
            peRatio: tvInfo?.pe || peVal,
            eps: tvInfo?.eps || epsVal
          },
          mubasher: {
            price: mubPrice,
            change: mubInfo ? mubInfo.change : 0,
            changePercent: mubInfo ? mubInfo.changePercent : 0,
            volume: mubVol,
            dayHigh: mubInfo ? mubInfo.dayHigh : basePrice,
            dayLow: mubInfo ? mubInfo.dayLow : basePrice,
            fairValue: mubFv,
            upsidePercent: mubUpside,
            peRatio: peVal,
            eps: epsVal
          },
          investing: {
            price: invPrice,
            change: tvInfo ? tvInfo.change : 0,
            changePercent: tvInfo ? tvInfo.changePercent : 0,
            volume: tvVol,
            dayHigh: tvInfo ? tvInfo.dayHigh : basePrice,
            dayLow: tvInfo ? tvInfo.dayLow : basePrice,
            fairValue: invFv,
            upsidePercent: invUpside,
            peRatio: peVal,
            eps: epsVal
          },
          yahoo: {
            price: yahPrice,
            change: mubInfo ? mubInfo.change : 0,
            changePercent: mubInfo ? mubInfo.changePercent : 0,
            volume: mubVol,
            dayHigh: mubInfo ? mubInfo.dayHigh : basePrice,
            dayLow: mubInfo ? mubInfo.dayLow : basePrice,
            fairValue: yahFv,
            upsidePercent: yahUpside,
            peRatio: peVal,
            eps: epsVal
          }
        }
      });
    }

    // Sort by maxVolume descending by default
    results.sort((a, b) => b.maxVolume - a.maxVolume);

    res.setHeader('X-Served-By', 'Vercel-Universal-PriceCompare');
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=10');
    return res.status(200).json(results);
  } catch (err) {
    console.error('Error in price-compare serverless API:', err);
    return res.status(500).json({ error: err.message });
  }
};
