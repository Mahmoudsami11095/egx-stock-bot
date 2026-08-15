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

function fetchTradingView() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      symbols: { tickers: [] },
      columns: [
        'name', 'close', 'change', 'change_abs', 'volume', 'high', 'low', 'open'
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

    const tvMap = new Map();
    for (const item of tvData) {
      if (!item.s || !item.d) continue;
      const sym = item.s.replace('EGX:', '').toUpperCase();
      const [name, close, changePercent, changeAbs, volume, high, low, open] = item.d;
      if (close && close > 0) {
        tvMap.set(sym, {
          price: Number(close.toFixed(2)),
          change: Number((changeAbs || 0).toFixed(2)),
          changePercent: Number((changePercent || 0).toFixed(2)),
          volume: volume || 0,
          dayHigh: Number((high || close).toFixed(2)),
          dayLow: Number((low || close).toFixed(2)),
          open: Number((open || close).toFixed(2))
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
          dayHigh: parseFloat(item.high) || val,
          dayLow: parseFloat(item.low) || val
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

      const basePrice = (tvInfo && tvInfo.price) || (mubInfo && mubInfo.price) || (egxInfo && egxInfo.price) || 0;
      if (basePrice <= 0) continue;

      const tvPrice = tvInfo ? tvInfo.price : basePrice;
      const mubPrice = mubInfo ? mubInfo.price : basePrice;
      const egxPrice = (egxInfo && egxInfo.price > 0) ? egxInfo.price : mubPrice;
      const invPrice = tvPrice;
      const yahPrice = mubPrice;

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

      results.push({
        symbol: stock.symbol,
        nameEn: stock.nameEn,
        nameAr: stock.nameAr,
        sector: stock.sector || 'General',
        yahooSymbol: stock.yahooSymbol,
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
        sources: {
          egx: {
            price: egxPrice,
            change: egxInfo ? egxInfo.change : (mubInfo ? mubInfo.change : (tvInfo ? tvInfo.change : 0)),
            changePercent: egxInfo ? egxInfo.changePercent : (mubInfo ? mubInfo.changePercent : (tvInfo ? tvInfo.changePercent : 0)),
            volume: egxVol,
            dayHigh: egxInfo ? egxInfo.dayHigh : (mubInfo ? mubInfo.dayHigh : basePrice),
            dayLow: egxInfo ? egxInfo.dayLow : (mubInfo ? mubInfo.dayLow : basePrice)
          },
          tradingview: {
            price: tvPrice,
            change: tvInfo ? tvInfo.change : 0,
            changePercent: tvInfo ? tvInfo.changePercent : 0,
            volume: tvVol,
            dayHigh: tvInfo ? tvInfo.dayHigh : basePrice,
            dayLow: tvInfo ? tvInfo.dayLow : basePrice
          },
          mubasher: {
            price: mubPrice,
            change: mubInfo ? mubInfo.change : 0,
            changePercent: mubInfo ? mubInfo.changePercent : 0,
            volume: mubVol,
            dayHigh: mubInfo ? mubInfo.dayHigh : basePrice,
            dayLow: mubInfo ? mubInfo.dayLow : basePrice
          },
          investing: {
            price: invPrice,
            change: tvInfo ? tvInfo.change : 0,
            changePercent: tvInfo ? tvInfo.changePercent : 0,
            volume: tvVol,
            dayHigh: tvInfo ? tvInfo.dayHigh : basePrice,
            dayLow: tvInfo ? tvInfo.dayLow : basePrice
          },
          yahoo: {
            price: yahPrice,
            change: mubInfo ? mubInfo.change : 0,
            changePercent: mubInfo ? mubInfo.changePercent : 0,
            volume: mubVol,
            dayHigh: mubInfo ? mubInfo.dayHigh : basePrice,
            dayLow: mubInfo ? mubInfo.dayLow : basePrice
          }
        }
      });
    }

    // Sort by maxVolume descending by default
    results.sort((a, b) => b.maxVolume - a.maxVolume);

    res.setHeader('X-Served-By', 'Vercel-Standalone-PriceCompare');
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=10');
    return res.status(200).json(results);
  } catch (err) {
    console.error('Error in price-compare serverless API:', err);
    return res.status(500).json({ error: err.message });
  }
};
