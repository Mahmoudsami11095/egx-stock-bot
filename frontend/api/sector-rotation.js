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

const SECTOR_ARABIC_MAP = {
  'Finance': { ar: '🏦 البنوك والخدمات المالية', icon: '🏦', category: 'FINANCIAL' },
  'Process Industries': { ar: '🏭 الصناعات التحويلية والكيماويات', icon: '🏭', category: 'INDUSTRIAL' },
  'Non-Energy Minerals': { ar: '⛏️ التعدين والمعادن والحديد', icon: '⛏️', category: 'MATERIALS' },
  'Health Technology': { ar: '💊 الأدوية والتكنولوجيا الصحية', icon: '💊', category: 'HEALTHCARE' },
  'Producer Manufacturing': { ar: '🔧 الصناعات والآلات الإنتاجية', icon: '🔧', category: 'INDUSTRIAL' },
  'Consumer Non-Durables': { ar: '🛒 الأغذية والسلع الاستهلاكية', icon: '🛒', category: 'CONSUMER' },
  'Industrial Services': { ar: '🏗️ المقاولات والخدمات الصناعية', icon: '🏗️', category: 'SERVICES' },
  'Technology Services': { ar: '💻 التكنولوجيا والمدفوعات الإلكترونية', icon: '💻', category: 'TECH' },
  'Communications': { ar: '📡 الاتصالات وتكنولوجيا المعلومات', icon: '📡', category: 'TELECOM' },
  'Distribution Services': { ar: '📦 التوزيع والتجارة واللوجستيات', icon: '📦', category: 'SERVICES' },
  'Consumer Durables': { ar: '🏠 التطوير العقاري والسلع المعمرة', icon: '🏠', category: 'REAL_ESTATE' },
  'Energy Minerals': { ar: '⛽ الطاقة والبترول والتنقيب', icon: '⛽', category: 'ENERGY' },
  'Consumer Services': { ar: '🎭 السياحة والترفيه وخدمات المستهلك', icon: '🎭', category: 'CONSUMER' },
  'Retail Trade': { ar: '🛍️ تجارة التجزئة والمتاجر', icon: '🛍️', category: 'RETAIL' },
  'Utilities': { ar: '⚡ المرافق العامة والطاقة المتجددة', icon: '⚡', category: 'UTILITIES' },
  'Commercial Services': { ar: '💼 الخدمات التجارية والاستشارية', icon: '💼', category: 'SERVICES' },
  'Transportation': { ar: '🚢 النقل والشحن والخدمات البحرية', icon: '🚢', category: 'TRANSPORT' },
  'Health Services': { ar: '🏥 الرعاية والخدمات الصحية والمستشفيات', icon: '🏥', category: 'HEALTHCARE' },
  'Electronic Technology': { ar: '🔌 الصناعات الإلكترونية والكابلات', icon: '🔌', category: 'TECH' },
  'Miscellaneous': { ar: '📋 شركات قابضة واستثمارات متنوعة', icon: '📋', category: 'HOLDING' },
  'Unknown': { ar: '❓ أسهم أخرى غير مصنفة', icon: '❓', category: 'OTHER' }
};

const SECTOR_PE = {
  'Finance': 7.5,
  'Process Industries': 8.5,
  'Non-Energy Minerals': 7.0,
  'Health Technology': 11.0,
  'Producer Manufacturing': 9.0,
  'Consumer Non-Durables': 12.0,
  'Industrial Services': 8.5,
  'Technology Services': 14.0,
  'Communications': 9.0,
  'Distribution Services': 9.5,
  'Consumer Durables': 10.0,
  'Energy Minerals': 8.5,
  'Consumer Services': 11.0,
  'Retail Trade': 10.0,
  'Utilities': 9.0,
  'Commercial Services': 9.0,
  'Transportation': 8.5,
  'Health Services': 12.5,
  'Electronic Technology': 12.0,
  'Miscellaneous': 9.0,
  'Unknown': 9.0
};

// Valuation Formulas
function computeGrahamFV(eps, bvps, price) {
  if (typeof eps !== 'number' || eps <= 0) return undefined;
  const effectiveBvps = (typeof bvps === 'number' && bvps > 0) ? bvps : (price > 0 ? price * 0.7 : undefined);
  if (!effectiveBvps) return undefined;
  const raw = Math.sqrt(22.5 * eps * effectiveBvps);
  if (isNaN(raw) || raw <= 0) return undefined;
  return Number(raw.toFixed(2));
}

function computeSectorPeFV(eps, sector, price) {
  if (typeof eps !== 'number' || eps <= 0) return undefined;
  const peMultiplier = SECTOR_PE[sector] || 9.0;
  const macroDiscount = 0.82; // 18% CBE discount
  const raw = eps * peMultiplier * macroDiscount;
  if (isNaN(raw) || raw <= 0) return undefined;
  return Number(raw.toFixed(2));
}

function computeLynchFV(eps, dy, price) {
  if (typeof eps !== 'number' || eps <= 0) return undefined;
  const dividendYield = (typeof dy === 'number' && dy > 0) ? dy : 0;
  const multiplier = Math.min(10.0 + dividendYield, 25.0);
  const raw = eps * multiplier;
  if (isNaN(raw) || raw <= 0) return undefined;
  return Number(raw.toFixed(2));
}

function computePbRoeFV(bvps, roe, price) {
  const effectiveBvps = (typeof bvps === 'number' && bvps > 0) ? bvps : (price > 0 ? price * 0.7 : undefined);
  if (!effectiveBvps) return undefined;
  const effectiveRoe = (typeof roe === 'number' && roe > 0) ? roe : 15.0;
  const costOfEquity = 20.0;
  const justifiedPb = Math.min(Math.max(effectiveRoe / costOfEquity, 0.6), 3.5);
  const raw = effectiveBvps * justifiedPb;
  if (isNaN(raw) || raw <= 0) return undefined;
  return Number(raw.toFixed(2));
}

function computeConsensusFV(grahamFv, peFv, lynchFv, pbFv, price) {
  const validModels = [grahamFv, peFv, lynchFv, pbFv].filter(v => typeof v === 'number' && v > 0);
  if (validModels.length > 0) {
    const sum = validModels.reduce((a, b) => a + b, 0);
    return Number((sum / validModels.length).toFixed(2));
  }
  return price > 0 ? Number((price * 1.05).toFixed(2)) : undefined;
}

function fetchTradingViewScan() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      symbols: { tickers: [] },
      columns: [
        'name', 'description', 'close', 'change', 'change_abs', 'volume',
        'average_volume_10d_calc', 'Value.Traded', 'high', 'low', 'open', 'sector',
        'earnings_per_share_basic_ttm', 'price_earnings_ttm', 'price_book_ratio', 'book_value_per_share',
        'dividend_yield_recent', 'return_on_equity', 'RSI', 'SMA20', 'SMA50', 'market_cap_basic',
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
      timeout: 8000
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'X-Served-By, X-Data-Timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawData = await fetchTradingViewScan();

    const sectorGroups = new Map();
    let totalMarketTurnover = 0;
    let totalMarketVolume = 0;
    let totalMarketCap = 0;
    let totalStocksCount = 0;

    for (const item of rawData) {
      if (!item.s || !item.d) continue;
      const sym = item.s.replace('EGX:', '').toUpperCase();
      const [
        name, desc, close, changePercent, changeAbs, volume,
        avgVol10d, valueTraded, high, low, open, rawSector,
        eps, pe, pb, bvps, dy, roe, rsi, sma20, sma50, marketCap,
        netIncome, netMargin, operatingMargin, totalRevenue
      ] = item.d;

      if (typeof close !== 'number' || close <= 0) continue;

      const sectorKey = rawSector || 'Unknown';
      const meta = watchlistMetaMap.get(sym);
      const nameAr = (meta && meta.nameAr) || sym;
      const nameEn = (meta && meta.nameEn) || desc || name || sym;

      const price = Number(close.toFixed(2));
      const chgPct = typeof changePercent === 'number' ? Number(changePercent.toFixed(2)) : 0;
      const vol = volume || 0;
      const avgVol = (typeof avgVol10d === 'number' && avgVol10d > 0) ? avgVol10d : vol;
      const turnover = typeof valueTraded === 'number' ? valueTraded : (vol * price);
      const mcap = typeof marketCap === 'number' ? marketCap : 0;
      
      const volSurge = avgVol > 0 ? Number((vol / avgVol).toFixed(2)) : 1.0;

      // Calculate consensus fair value
      const graham = computeGrahamFV(eps, bvps, price);
      const peFv = computeSectorPeFV(eps, sectorKey, price);
      const lynch = computeLynchFV(eps, dy, price);
      const pbFv = computePbRoeFV(bvps, roe, price);
      const consensusFv = computeConsensusFV(graham, peFv, lynch, pbFv, price);
      const upside = (consensusFv && price > 0) ? Number((((consensusFv - price) / price) * 100).toFixed(2)) : 0;

      const stockData = {
        symbol: sym,
        nameAr,
        nameEn,
        price,
        change: typeof changeAbs === 'number' ? Number(changeAbs.toFixed(2)) : 0,
        changePercent: chgPct,
        volume: vol,
        avgVolume10d: Math.round(avgVol),
        volumeSurge: volSurge,
        turnoverEgp: Math.round(turnover),
        rsi: (typeof rsi === 'number' && !isNaN(rsi)) ? Number(rsi.toFixed(1)) : undefined,
        sma20: (typeof sma20 === 'number' && !isNaN(sma20)) ? Number(sma20.toFixed(2)) : undefined,
        sma50: (typeof sma50 === 'number' && !isNaN(sma50)) ? Number(sma50.toFixed(2)) : undefined,
        aboveSma20: (typeof sma20 === 'number' && sma20 > 0) ? price >= sma20 : true,
        marketCap: mcap,
        fairValue: consensusFv,
        upsidePercent: upside,
        peRatio: (typeof pe === 'number' && !isNaN(pe) && pe > 0) ? Number(pe.toFixed(2)) : undefined,
        eps: (typeof eps === 'number' && !isNaN(eps)) ? Number(eps.toFixed(2)) : undefined,
        pbRatio: (typeof pb === 'number' && !isNaN(pb) && pb > 0) ? Number(pb.toFixed(2)) : undefined,
        dividendYield: (typeof dy === 'number' && !isNaN(dy)) ? Number(dy.toFixed(2)) : undefined,
        netIncome: (typeof netIncome === 'number' && !isNaN(netIncome)) ? netIncome : undefined,
        netProfitMargin: (typeof netMargin === 'number' && !isNaN(netMargin)) ? Number(netMargin.toFixed(2)) : undefined,
        grossProfit: (typeof totalRevenue === 'number' && !isNaN(totalRevenue)) ? totalRevenue : undefined
      };

      if (!sectorGroups.has(sectorKey)) {
        sectorGroups.set(sectorKey, []);
      }
      sectorGroups.get(sectorKey).push(stockData);

      totalMarketTurnover += turnover;
      totalMarketVolume += vol;
      totalMarketCap += mcap;
      totalStocksCount++;
    }

    const sectors = [];

    for (const [sectorKey, stocks] of sectorGroups.entries()) {
      const info = SECTOR_ARABIC_MAP[sectorKey] || {
        ar: sectorKey,
        icon: '📊',
        category: 'GENERAL'
      };

      const sectorTurnover = stocks.reduce((sum, s) => sum + s.turnoverEgp, 0);
      const sectorVolume = stocks.reduce((sum, s) => sum + s.volume, 0);
      const sectorMarketCap = stocks.reduce((sum, s) => sum + (s.marketCap || 0), 0);
      const liquidityShare = totalMarketTurnover > 0 ? Number(((sectorTurnover / totalMarketTurnover) * 100).toFixed(2)) : 0;

      // Active stocks with volume > 0 for calculating surge
      const activeStocks = stocks.filter(s => s.volume > 0);
      const avgVolumeSurge = activeStocks.length > 0 
        ? Number((activeStocks.reduce((sum, s) => sum + s.volumeSurge, 0) / activeStocks.length).toFixed(2))
        : 1.0;

      const avgPriceChange = stocks.length > 0
        ? Number((stocks.reduce((sum, s) => sum + s.changePercent, 0) / stocks.length).toFixed(2))
        : 0;

      const validRsiStocks = stocks.filter(s => typeof s.rsi === 'number');
      const avgRsi = validRsiStocks.length > 0
        ? Number((validRsiStocks.reduce((sum, s) => sum + s.rsi, 0) / validRsiStocks.length).toFixed(1))
        : undefined;

      const validPeStocks = stocks.filter(s => typeof s.peRatio === 'number' && s.peRatio > 0 && s.peRatio < 100);
      const avgPe = validPeStocks.length > 0
        ? Number((validPeStocks.reduce((sum, s) => sum + s.peRatio, 0) / validPeStocks.length).toFixed(1))
        : undefined;

      const validUpsideStocks = stocks.filter(s => typeof s.upsidePercent === 'number');
      const avgUpsidePercent = validUpsideStocks.length > 0
        ? Number((validUpsideStocks.reduce((sum, s) => sum + s.upsidePercent, 0) / validUpsideStocks.length).toFixed(1))
        : 0;

      const validMarginStocks = stocks.filter(s => typeof s.netProfitMargin === 'number');
      const avgNetMargin = validMarginStocks.length > 0
        ? Number((validMarginStocks.reduce((sum, s) => sum + s.netProfitMargin, 0) / validMarginStocks.length).toFixed(1))
        : undefined;

      // Determine Sector Rotation Phase
      let rotationPhase = 'BASE_BUILDING';
      let phaseLabelAr = '💤 قاع وانتظار السيولة';
      let phaseDescriptionAr = 'القطاع في حالة هدوء نسبي وتداول اعتيادي في انتظار دورة تدوير السيولة القادمة.';

      if (avgVolumeSurge >= 1.25 && avgPriceChange >= -1.0 && avgPriceChange <= 2.5 && avgUpsidePercent >= 15.0) {
        rotationPhase = 'ACCUMULATION';
        phaseLabelAr = '🎯 تجميع صامت (المرشح التالي)';
        phaseDescriptionAr = 'تدفق سيولة غير معتادة وتجميع مؤسسي هادئ مع استقرار الأسعار وهوامش نمو وقيمة عادلة مرتفعة.';
      } else if (avgVolumeSurge >= 1.1 && avgPriceChange > 2.0) {
        rotationPhase = 'MARKUP';
        phaseLabelAr = '🚀 انطلاق وزخم نشط';
        phaseDescriptionAr = 'القطاع في قلب الصعود والزخم السعري النشط مع دخول سيولة قوية تدفع الأسعار لأعلى.';
      } else if ((avgRsi && avgRsi > 68) || (avgPriceChange > 3.0 && avgVolumeSurge < 0.85)) {
        rotationPhase = 'DISTRIBUTION';
        phaseLabelAr = '⚠️ تشبع وجني أرباح';
        phaseDescriptionAr = 'وصول القطاع لمناطق تشبع شرائي وتراجع في زخم السيولة مما ينبئ بقرب انتقال السيولة لقطاع آخر.';
      }

      // Sort constituent stocks by turnover descending
      stocks.sort((a, b) => b.turnoverEgp - a.turnoverEgp);

      sectors.push({
        sectorKey,
        nameAr: info.ar,
        nameEn: sectorKey,
        icon: info.icon,
        category: info.category,
        stocksCount: stocks.length,
        totalTurnoverEgp: sectorTurnover,
        totalVolume: sectorVolume,
        totalMarketCap: sectorMarketCap,
        liquiditySharePercent: liquidityShare,
        avgVolumeSurge,
        avgPriceChange,
        avgRsi,
        avgPe,
        avgUpsidePercent,
        avgNetMargin,
        rotationPhase,
        phaseLabelAr,
        phaseDescriptionAr,
        stocks
      });
    }

    // Min-Max Normalization for Rotation Potential Score (0 - 100)
    if (sectors.length > 0) {
      const maxSurge = Math.max(...sectors.map(s => s.avgVolumeSurge), 1.0);
      const minSurge = Math.min(...sectors.map(s => s.avgVolumeSurge), 0.5);
      
      const maxUpside = Math.max(...sectors.map(s => s.avgUpsidePercent), 10);
      const minUpside = Math.min(...sectors.map(s => s.avgUpsidePercent), -10);

      const maxShare = Math.max(...sectors.map(s => s.liquiditySharePercent), 1.0);
      const minShare = Math.min(...sectors.map(s => s.liquiditySharePercent), 0.1);

      for (const s of sectors) {
        const normSurge = Math.max(0, Math.min(100, ((s.avgVolumeSurge - minSurge) / (maxSurge - minSurge || 1)) * 100));
        const normUpside = Math.max(0, Math.min(100, ((s.avgUpsidePercent - minUpside) / (maxUpside - minUpside || 1)) * 100));
        const normShare = Math.max(0, Math.min(100, ((s.liquiditySharePercent - minShare) / (maxShare - minShare || 1)) * 100));

        let phaseBonus = 10;
        if (s.rotationPhase === 'ACCUMULATION') phaseBonus = 35;
        else if (s.rotationPhase === 'MARKUP') phaseBonus = 25;
        else if (s.rotationPhase === 'BASE_BUILDING') phaseBonus = 15;
        else if (s.rotationPhase === 'DISTRIBUTION') phaseBonus = 0;

        const rawScore = (normSurge * 0.35) + (normUpside * 0.35) + (normShare * 0.15) + (phaseBonus * 0.15);
        s.rotationScore = Math.max(10, Math.min(99, Math.round(rawScore)));
      }
    }

    // Sort sectors by rotationScore descending
    sectors.sort((a, b) => b.rotationScore - a.rotationScore);

    // Identify Leaders
    const leadingByShare = [...sectors].sort((a, b) => b.totalTurnoverEgp - a.totalTurnoverEgp)[0];
    const topAccumulation = sectors.find(s => s.rotationPhase === 'ACCUMULATION') || sectors[0];

    const responsePayload = {
      summary: {
        totalMarketTurnover: Math.round(totalMarketTurnover),
        totalMarketVolume,
        totalMarketCap: Math.round(totalMarketCap),
        totalStocksCount,
        totalSectorsCount: sectors.length,
        leadingSector: {
          sectorKey: leadingByShare?.sectorKey,
          nameAr: leadingByShare?.nameAr,
          icon: leadingByShare?.icon,
          turnoverEgp: leadingByShare?.totalTurnoverEgp,
          liquiditySharePercent: leadingByShare?.liquiditySharePercent
        },
        topAccumulationSector: {
          sectorKey: topAccumulation?.sectorKey,
          nameAr: topAccumulation?.nameAr,
          icon: topAccumulation?.icon,
          rotationScore: topAccumulation?.rotationScore,
          avgVolumeSurge: topAccumulation?.avgVolumeSurge,
          avgUpsidePercent: topAccumulation?.avgUpsidePercent
        },
        timestamp: new Date().toISOString()
      },
      sectors
    };

    res.setHeader('X-Served-By', 'EGX-Sector-Liquidity-Rotation-Radar');
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=10');
    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error('Error in sector-rotation API:', err);
    return res.status(500).json({ error: err.message });
  }
};
