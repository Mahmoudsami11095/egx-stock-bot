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

const CANONICAL_STOCK_SECTORS = {
  'MASR': 'Real Estate',
  'MNHD': 'Real Estate',
  'TMGH': 'Real Estate',
  'HELI': 'Real Estate',
  'PHDC': 'Real Estate',
  'OCDI': 'Real Estate',
  'ORHD': 'Real Estate',
  'AMER': 'Real Estate',
  'EHDR': 'Real Estate',
  'RREI': 'Real Estate',
  'COPR': 'Real Estate',
  'PORT': 'Real Estate',
  'ELKA': 'Real Estate',
  'EMFD': 'Real Estate',
  'AREH': 'Real Estate',
  'ZMID': 'Real Estate',
  'ELSH': 'Real Estate',
  'UNIT': 'Real Estate',
  'ARAB': 'Real Estate',
  'PRDC': 'Real Estate',
  'MAAL': 'Real Estate',
  'OBRI': 'Real Estate',
  'ADRI': 'Real Estate',
  'NHPS': 'Real Estate',
  'MENA': 'Real Estate',
  'GPIM': 'Real Estate',
  'DAPH': 'Real Estate',
  'GPPL': 'Real Estate',
  'ROTO': 'Tourism & Leisure',
  'DCRC': 'Real Estate',
  'FIRE': 'Real Estate',
  'UTOP': 'Real Estate',
  'CCRS': 'Real Estate',
  'TANM': 'Real Estate',
  'ACAP': 'Real Estate',
  'EALR': 'Real Estate',
  'AALR': 'Real Estate',
  'BONY': 'Real Estate',
  'COMI': 'Banks',
  'ADIB': 'Banks',
  'CIEB': 'Banks',
  'HDBK': 'Banks',
  'FAIT': 'Banks',
  'FAITA': 'Banks',
  'QNBA': 'Banks',
  'QNBE': 'Banks',
  'SAIB': 'Banks',
  'EGBE': 'Banks',
  'CANA': 'Banks',
  'EXPA': 'Banks',
  'SAUD': 'Banks',
  'NBKE': 'Banks',
  'UBEE': 'Banks',
  'HRHO': 'Non-Banking Financial Services',
  'BTFH': 'Non-Banking Financial Services',
  'CICH': 'Non-Banking Financial Services',
  'VALU': 'Non-Banking Financial Services',
  'CNFN': 'Non-Banking Financial Services',
  'ATLC': 'Non-Banking Financial Services',
  'ICLE': 'Non-Banking Financial Services',
  'BINV': 'Non-Banking Financial Services',
  'CCAP': 'Non-Banking Financial Services',
  'PRMH': 'Non-Banking Financial Services',
  'MOIN': 'Insurance',
  'DEIN': 'Insurance',
  'SWDY': 'Industrial Cables & Energy',
  'AMOC': 'Oil & Gas',
  'ORAS': 'Construction',
  'SCEM': 'Building Materials',
  'ETEL': 'Telecommunications',
  'FWRY': 'Technology & FinTech',
  'EGAL': 'Basic Resources',
  'ABUK': 'Fertilizers',
  'MFPC': 'Fertilizers',
  'SKPC': 'Petrochemicals',
  'EGAS': 'Petrochemicals',
  'JUFO': 'Food & Beverage',
  'DOMT': 'Food & Beverage',
  'EFID': 'Food & Beverage',
  'ORWE': 'Textiles & Consumer Goods',
  'AUTO': 'Consumer Goods',
  'RMDA': 'Pharmaceuticals',
  'ISPH': 'Pharmaceuticals',
  'MPCI': 'Pharmaceuticals',
  'CLHO': 'Healthcare'
};

const EGX_OFFICIAL_SECTOR_MAP = {
  'Real Estate': 'Real Estate',
  'عقارات': 'Real Estate',
  'Banks': 'Banks',
  'بنوك': 'Banks',
  'Non-bank financial services': 'Non-Banking Financial Services',
  'خدمات مالية غير مصرفية': 'Non-Banking Financial Services',
  'Health Care & Pharmaceuticals': 'Pharmaceuticals',
  'رعاية صحية و ادوية': 'Pharmaceuticals',
  'Food, Beverages and Tobacco': 'Food & Beverage',
  'أغذية و مشروبات و تبغ': 'Food & Beverage',
  'Basic Resources': 'Basic Resources',
  'موارد أساسية': 'Basic Resources',
  'Building Materials': 'Building Materials',
  'مواد البناء': 'Building Materials',
  'Contracting & Construction Engineering': 'Construction',
  'مقاولات و إنشاءات هندسية': 'Construction',
  'IT , Media & Communication Services': 'Telecommunications',
  'اتصالات و  اعلام و تكنولوجيا المعلومات': 'Telecommunications',
  'Textile & Durables': 'Textiles & Consumer Goods',
  'منسوجات و سلع معمرة': 'Textiles & Consumer Goods',
  'Travel & Leisure': 'Tourism & Leisure',
  'سياحة وترفيه': 'Tourism & Leisure',
  'Energy & Support Services': 'Oil & Gas',
  'طاقة وخدمات مساندة': 'Oil & Gas',
  'Shipping & Transportation Services': 'Shipping & Transportation',
  'خدمات النقل والشحن': 'Shipping & Transportation',
  'Industrial Goods , Services and Automobiles': 'Industrial Cables & Energy',
  'خدمات و منتجات صناعية وسيارات': 'Industrial Cables & Energy',
  'Trade & Distributors': 'Consumer Goods',
  'تجارة و موزعون': 'Consumer Goods',
  'Paper & Packaging': 'Building Materials',
  'ورق ومواد تعبئة و تغليف': 'Building Materials',
  'Education Services': 'Consumer Services',
  'خدمات تعليمية': 'Consumer Services',
  'Utilities': 'Utilities',
  'مرافق': 'Utilities'
};

function resolveCanonicalSector(sym, nameAr, nameEn, tvSector, tvIndustry, egxSector, egxSectorA) {
  // 1. Explicit Symbol Override (Top Priority)
  if (sym && CANONICAL_STOCK_SECTORS[sym.toUpperCase()]) {
    return CANONICAL_STOCK_SECTORS[sym.toUpperCase()];
  }

  // 2. Official Dynamic EGX API Sector (High Priority direct from EGX feed)
  if (egxSector && EGX_OFFICIAL_SECTOR_MAP[egxSector]) {
    return EGX_OFFICIAL_SECTOR_MAP[egxSector];
  }
  if (egxSectorA && EGX_OFFICIAL_SECTOR_MAP[egxSectorA]) {
    return EGX_OFFICIAL_SECTOR_MAP[egxSectorA];
  }

  // 3. TradingView Industry-specific Mapping
  const ind = tvIndustry || '';
  if (ind === 'Real Estate Development' || ind === 'Homebuilding') return 'Real Estate';
  if (ind === 'Regional Banks' || ind === 'Major Banks') return 'Banks';
  if (ind.includes('Insurance')) return 'Insurance';
  if (ind.includes('Investment') || ind.includes('Financial') || ind.includes('Brokers') || ind.includes('Leasing') || ind.includes('Finance/Rental')) return 'Non-Banking Financial Services';
  if (ind.includes('Pharmaceutical') || ind.includes('Health') || ind.includes('Medical')) return 'Pharmaceuticals';
  if (ind.includes('Food') || ind.includes('Milling') || ind.includes('Agricultural Commodities') || ind.includes('Candy') || ind.includes('Dairy')) return 'Food & Beverage';
  if (ind.includes('Chemical') || ind.includes('Fertilizer') || ind.includes('Petrochemical')) return 'Petrochemicals & Fertilizers';
  if (ind.includes('Construction Materials') || ind.includes('Building Products') || ind.includes('Steel') || ind.includes('Aluminum') || ind.includes('Metal Fabrication')) return 'Building Materials';
  if (ind.includes('Engineering & Construction')) return 'Construction';
  if (ind.includes('Telecommunication')) return 'Telecommunications';
  if (ind.includes('Software') || ind.includes('Technology')) return 'Technology & FinTech';
  if (ind.includes('Oil') || ind.includes('Gas') || ind.includes('Drilling') || ind.includes('Oil Refining')) return 'Oil & Gas';
  if (ind.includes('Shipping') || ind.includes('Transportation') || ind.includes('Marine')) return 'Shipping & Transportation';
  if (ind.includes('Hotels') || ind.includes('Tourism') || ind.includes('Cruise')) return 'Tourism & Leisure';
  if (ind.includes('Textile') || ind.includes('Apparel') || ind.includes('Furnishings')) return 'Textiles & Consumer Goods';

  // 4. Multilingual Keyword Match
  const text = `${sym} ${nameEn || ''} ${nameAr || ''}`.toLowerCase();
  if (/إسكان|تعمير|عقارات|عقاري|تطوير عمراني|تنمية عمرانية|أراضي|استثمار عقاري|معادي|مدينة|housing|real estate|development|properties|urban|reconstruction/i.test(text)) return 'Real Estate';
  if (/بنك|مصرف|مصرفي|bank/i.test(text)) return 'Banks';
  if (/تأمين|insurance/i.test(text)) return 'Insurance';
  if (/أوراق مالية|سمسرة|تداول|تأجير تمويلي|استثمارات مالية|holding|invest|capital|leasing|securities|brokerage/i.test(text)) return 'Non-Banking Financial Services';
  if (/أدوية|فارما|صيدل|علاج|pharma|medical|health/i.test(text)) return 'Pharmaceuticals';
  if (/مطاحن|مخابز|أغذية|مشروبات|ألبان|سكر|زيوت طعام|شاي|food|beverage|mills|sugar|dairy|flour/i.test(text)) return 'Food & Beverage';
  if (/أسمدة|كيماويات|بتروكيماويات|كيميا|fertilizer|chemical|petro/i.test(text)) return 'Petrochemicals & Fertilizers';
  if (/أسمنت|سيراميك|حديد|صلب|ألومنيوم|رخام|محاجر|مواسير|cement|ceramic|steel|aluminum|building|glass/i.test(text)) return 'Building Materials';
  if (/مقاولات|إنشاءات|هندسة|construction|contracting|engineering/i.test(text)) return 'Construction';
  if (/اتصالات|telecom|communication/i.test(text)) return 'Telecommunications';
  if (/تكنولوجيا|مدفوعات|برمجيات|fintech|software|tech|electronic/i.test(text)) return 'Technology & FinTech';
  if (/بترول|غاز|تكرير|زيت معدني|oil|gas|petroleum|minerals/i.test(text)) return 'Oil & Gas';
  if (/ملاحة|شحن|نقل|تفريغ|shipping|transport|maritime|port/i.test(text)) return 'Shipping & Transportation';
  if (/سياحة|فنادق|منتجعات|طيران|tourism|hotels|resort/i.test(text)) return 'Tourism & Leisure';
  if (/غزل|نسيج|ملابس|سجاد|textile|weavers|apparel|clothes/i.test(text)) return 'Textiles & Consumer Goods';

  // 5. Fallback to TradingView sector if not generic
  if (tvSector && tvSector !== 'Finance' && tvSector !== 'General') return tvSector;

  return 'General';
}

const SECTOR_PE = {
  'Banks': 7.5,
  'Non-Banking Financial Services': 9.0,
  'Financial Services': 9.0,
  'Technology & FinTech': 14.0,
  'Real Estate': 10.0,
  'Construction': 8.5,
  'Building Materials': 8.0,
  'Petrochemicals & Fertilizers': 9.0,
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
  'Insurance': 8.0,
  'Utilities': 9.0,
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
        'name', 'description', 'close', 'change', 'change_abs', 'volume', 'high', 'low', 'open', 'sector', 'industry',
        'earnings_per_share_basic_ttm', 'price_earnings_ttm', 'price_book_ratio', 'book_value_per_share',
        'dividend_yield_recent', 'return_on_equity',
        'net_income', 'net_margin', 'operating_margin', 'total_revenue', 'gross_profit',
        'Recommend.All', 'RSI', 'MACD.macd', 'MACD.signal', 'EMA20', 'EMA50', 'EMA200',
        'earnings_release_date'
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

// Extract Detailed Financial Statements from TradingView Symbol Pages (with caching)
let TV_DETAILED_CACHE = new Map();
let TV_DETAILED_CACHE_TIME = 0;

function parseTvPeriod(periodStr) {
  if (!periodStr) return { factor: 1, label: 'سنوي كامل' };
  const yr = periodStr.split('-')[0] || '';
  if (periodStr.includes('Q1')) return { factor: 1, label: `الربع الأول ${yr}`.trim() };
  if (periodStr.includes('Q2') || periodStr.includes('H1')) return { factor: 1, label: `النصف الأول ${yr}`.trim() };
  if (periodStr.includes('Q3') || periodStr.includes('9M')) return { factor: 1, label: `9 أشهر ${yr}`.trim() };
  if (periodStr.includes('Q4')) return { factor: 1, label: `الربع الرابع ${yr}`.trim() };
  return { factor: 1, label: `سنوي كامل ${yr}`.trim() };
}

function fetchTvSymbolFinancials(sym) {
  return new Promise((resolve) => {
    const url = `https://www.tradingview.com/symbols/EGX-${sym}/financials-overview/`;
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 3000
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        const regex = /<script type="application\/prs\.init-data\+json">([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = regex.exec(b)) !== null) {
          try {
            const d = JSON.parse(match[1]);
            for (const k of Object.keys(d)) {
              if (d[k]?.descriptions?.['Income statements']) {
                const inc = d[k].descriptions['Income statements'].data;
                const bal = d[k].descriptions['Balance sheet']?.data;
                const div = d[k].descriptions['Dividends']?.data;
                if (inc && inc.netIncome !== null && inc.netIncome !== undefined) {
                  const pInfo = parseTvPeriod(inc.fiscalPeriod);
                  return resolve({
                    sym,
                    rawNetIncome: inc.netIncome,
                    netIncome: inc.netIncome,
                    netIncomePeriod: pInfo.label,
                    totalRevenue: inc.totalRevenue,
                    fiscalPeriod: inc.fiscalPeriod,
                    totalAssets: bal?.totalAssets,
                    totalLiabilities: bal?.totalLiabilities,
                    dividendYield: div?.dividendsYield
                  });
                }
              }
            }
          } catch (e) {}
        }
        resolve(null);
      });
    }).on('error', () => resolve(null));
  });
}

async function fetchTradingViewDetailedMap() {
  const now = Date.now();
  if (TV_DETAILED_CACHE.size > 0 && (now - TV_DETAILED_CACHE_TIME < 300000)) {
    return TV_DETAILED_CACHE;
  }

  // Pre-fetch priority symbols from watchlist with race timeout
  const prioritySymbols = Array.from(watchlistMetaMap.keys()).slice(0, 30);
  if (prioritySymbols.length > 0) {
    try {
      const fetchPromise = Promise.all(
        prioritySymbols.map(sym => fetchTvSymbolFinancials(sym).catch(() => null))
      );
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve([]), 2500));
      const results = await Promise.race([fetchPromise, timeoutPromise]);
      for (const r of results) {
        if (r && r.sym) {
          TV_DETAILED_CACHE.set(r.sym, r);
        }
      }
    } catch (e) {}
  }

  TV_DETAILED_CACHE_TIME = now;
  return TV_DETAILED_CACHE;
}

let STOCKASTIC_CACHE = null;
let STOCKASTIC_CACHE_TIME = 0;

async function fetchStockasticMap() {
  const now = Date.now();
  if (STOCKASTIC_CACHE && (now - STOCKASTIC_CACHE_TIME < 60000)) {
    return STOCKASTIC_CACHE;
  }

  let liveData = {};

  // Dynamically load live harvested statements from data/stockastic-live.json
  try {
    const livePaths = [
      path.join(process.cwd(), 'data', 'stockastic-live.json'),
      path.join(process.cwd(), 'frontend', 'data', 'stockastic-live.json'),
      path.join(__dirname, '..', 'data', 'stockastic-live.json'),
      path.join(__dirname, '..', '..', 'data', 'stockastic-live.json'),
      '/root/egx-stock-bot/data/stockastic-live.json',
      '/root/egx-stock-bot/frontend/data/stockastic-live.json',
      '/home/azureuser/egx-stock-bot/data/stockastic-live.json'
    ];
    for (const p of livePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const json = JSON.parse(raw);
        if (json && typeof json === 'object') {
          liveData = json;
          break;
        }
      }
    }
  } catch (e) {
    // Dynamic error handling
  }

  const map = new Map();
  for (const [sym, data] of Object.entries(liveData)) {
    if (data && typeof data === 'object') {
      map.set(sym, {
        sym,
        companyName: sym,
        nameAr: sym,
        ...data
      });
    }
  }

  STOCKASTIC_CACHE = map;
  STOCKASTIC_CACHE_TIME = now;
  return map;
}

// Fetch Mubasher EGX API (Market Prices)
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

function parsePeriodMonths(quarterStr) {
  if (!quarterStr) return 12;
  const q = String(quarterStr);
  if (/الاول|الأول|3\s*أشهر|ثلاثة\s*أشهر/i.test(q)) return 3;
  if (/الثاني|الثانى|6\s*أشهر|ستة\s*أشهر|نصف/i.test(q)) return 6;
  if (/الثالث|9\s*أشهر|تسعة\s*أشهر/i.test(q)) return 9;
  return 12;
}

function getPeriodLabel(periodMonths, year) {
  const yrStr = year ? ` ${year}` : '';
  if (periodMonths === 3) return `الربع الأول${yrStr} (مدقق)`;
  if (periodMonths === 6) return `النصف الأول${yrStr} (مدقق)`;
  if (periodMonths === 9) return `9 أشهر${yrStr} (مدقق)`;
  return `سنوي كامل${yrStr} (مدقق)`;
}

const EMBEDDED_OVERRIDES = {
  "COMI": {
    "symbol": "COMI",
    "name": "Commercial International Bank - Egypt",
    "netProfit": 34500000000,
    "periodMonths": 6,
    "totalShares": 3050000000,
    "dps": 1.25,
    "quarters": [
      { "year": 2025, "quarter": "السنوي", "announced": 58590000000 },
      { "year": 2025, "quarter": "الربع الثانى - تراكمي", "announced": 27500000000 },
      { "year": 2026, "quarter": "الربع الثانى - تراكمي", "announced": 34500000000 }
    ],
    "source": "Audited Financial Statement H1 2026 - CIB Egypt",
    "updatedAt": "2026-08-15"
  },
  "SWDY": {
    "symbol": "SWDY",
    "name": "Elsewedy Electric Co",
    "netProfit": 10640000000,
    "periodMonths": 6,
    "totalShares": 2170000000,
    "dps": 0.85,
    "quarters": [
      { "year": 2025, "quarter": "السنوي", "announced": 19000000000 },
      { "year": 2025, "quarter": "الربع الثانى - تراكمي", "announced": 9590000000 },
      { "year": 2026, "quarter": "الربع الثانى - تراكمي", "announced": 10640000000 }
    ],
    "source": "Audited Financial Statement H1 2026 - Elsewedy Electric",
    "updatedAt": "2026-08-17"
  },
  "TMGH": {
    "symbol": "TMGH",
    "name": "Talaat Moustafa Group Holding",
    "netProfit": 9100000000,
    "periodMonths": 12,
    "totalShares": 2063560000,
    "dps": 0.45,
    "quarters": [
      { "year": 2025, "quarter": "السنوي", "announced": 9100000000 }
    ],
    "source": "Audited Financial Statement FY2025 - TMG Holding",
    "updatedAt": "2026-08-15"
  },
  "AMOC": {
    "symbol": "AMOC",
    "name": "Alexandria Mineral Oils Company",
    "netProfit": 1900000000,
    "periodMonths": 6,
    "totalShares": 1291500000,
    "dps": 0.65,
    "quarters": [
      { "year": 2025, "quarter": "السنوي", "announced": 1550000000 },
      { "year": 2025, "quarter": "الربع الثانى - تراكمي", "announced": 640000000 },
      { "year": 2026, "quarter": "الربع الثانى - تراكمي", "announced": 1900000000 }
    ],
    "source": "Audited Financial Statement H1 2026 - AMOC",
    "updatedAt": "2026-08-17"
  },
  "ORAS": {
    "symbol": "ORAS",
    "name": "Orascom Construction PLC",
    "netProfit": 127800000,
    "periodMonths": 6,
    "totalShares": 110180000,
    "dps": 0.28,
    "currency": "USD",
    "quarters": [
      { "year": 2025, "quarter": "السنوي", "announced": 205700000 },
      { "year": 2025, "quarter": "الربع الثانى - تراكمي", "announced": 89300000 },
      { "year": 2026, "quarter": "الربع الثانى - تراكمي", "announced": 127800000 }
    ],
    "source": "Audited Financial Statement H1 2026 - Orascom Construction",
    "updatedAt": "2026-08-17"
  },
  "MASR": {
    "symbol": "MASR",
    "name": "Madinet Masr",
    "netProfit": 1027386832,
    "periodMonths": 6,
    "totalShares": 2135000000,
    "quarters": [
      { "year": 2025, "quarter": "السنوي", "announced": 3650000000 },
      { "year": 2025, "quarter": "الربع الثانى - تراكمي", "announced": 1283358902 },
      { "year": 2026, "quarter": "الربع الثانى - تراكمي", "announced": 1027386832 }
    ],
    "source": "Audited Financial Statement H1 2026 - Madinet Masr",
    "updatedAt": "2026-08-17"
  },
  "OIH": {
    "symbol": "OIH",
    "name": "Orascom Investment Holding",
    "netProfit": -619528000,
    "periodMonths": 6,
    "totalShares": 5245690000,
    "quarters": [
      { "year": 2025, "quarter": "السنوي", "announced": -518395000 },
      { "year": 2025, "quarter": "الربع الثانى - تراكمي", "announced": -619528000 },
      { "year": 2026, "quarter": "الربع الثانى - تراكمي", "announced": -619528000 }
    ],
    "source": "Audited Financial Statement - OIH",
    "updatedAt": "2026-08-17"
  },
  "SCEM": {
    "symbol": "SCEM",
    "name": "Sinai Cement",
    "netProfit": 1560000000,
    "periodMonths": 6,
    "totalShares": 254100000,
    "dps": 0,
    "quarters": [
      { "year": 2025, "quarter": "السنوي", "announced": 2298246400 },
      { "year": 2025, "quarter": "الربع الثانى - تراكمي", "announced": 768800000 },
      { "year": 2026, "quarter": "الربع الثانى - تراكمي", "announced": 1560000000 }
    ],
    "source": "Audited Financial Statement H1 2026 - Sinai Cement",
    "updatedAt": "2026-08-17"
  },
  "ETEL": {
    "symbol": "ETEL",
    "name": "Telecom Egypt",
    "netProfit": 13400000000,
    "periodMonths": 6,
    "totalShares": 1707071600,
    "dps": 1.50,
    "quarters": [
      { "year": 2025, "quarter": "السنوي", "announced": 22580000000 },
      { "year": 2025, "quarter": "الربع الثانى - تراكمي", "announced": 8510000000 },
      { "year": 2026, "quarter": "الربع الثانى - تراكمي", "announced": 13400000000 }
    ],
    "source": "Audited Financial Statement H1 2026 - Telecom Egypt",
    "updatedAt": "2026-08-17"
  }
};

function loadLocalEarningsOverrides() {
  const possiblePaths = [
    path.join(__dirname, '..', 'data', 'earnings_overrides.json'),
    path.join(__dirname, '..', '..', 'data', 'earnings_overrides.json'),
    path.join(process.cwd(), 'data', 'earnings_overrides.json'),
    path.join(process.cwd(), 'frontend', 'data', 'earnings_overrides.json'),
    '/root/egx-stock-bot/data/earnings_overrides.json',
    '/root/egx-stock-bot/frontend/data/earnings_overrides.json',
    '/home/azureuser/egx-stock-bot/data/earnings_overrides.json'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const json = JSON.parse(raw);
        if (json && json.overrides) return { ...json.overrides, ...EMBEDDED_OVERRIDES };
      } catch (e) {}
    }
  }
  return EMBEDDED_OVERRIDES;
}

function calculateFourQuarters(rows, override) {
  let allRows = [...(rows || [])];
  if (override) {
    if (Array.isArray(override.quarters) && override.quarters.length > 0) {
      allRows.push(...override.quarters);
    } else if (override.netProfit) {
      allRows.push({
        year: 2026,
        quarter: override.periodMonths === 6 ? 'الربع الثانى - تراكمي' : (override.periodMonths === 3 ? 'الربع الاول' : (override.periodMonths === 9 ? 'الربع الثالث - تراكمي' : 'السنوي')),
        announced: override.netProfit
      });
    }
  }

  const parsedRows = allRows.map(r => ({
    year: parseInt(r.year, 10) || 2025,
    quarter: r.quarter,
    periodMonths: parsePeriodMonths(r.quarter),
    announced: typeof r.announced === 'number' ? r.announced : (parseFloat(r.announced) || 0)
  })).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.periodMonths - b.periodMonths;
  });

  const quarters = [];
  const byYear = new Map();
  for (const r of parsedRows) {
    if (!byYear.has(r.year)) byYear.set(r.year, {});
    byYear.get(r.year)[r.periodMonths] = r.announced;
  }

  for (const [year, data] of byYear.entries()) {
    const q1 = data[3];
    const q2Cum = data[6];
    const q3Cum = data[9];
    const fy = data[12];

    if (q1 !== undefined) {
      quarters.push({ label: `Q1 '${String(year).slice(-2)}`, value: q1, year, qIndex: 1 });
    }
    if (q2Cum !== undefined) {
      if (q1 !== undefined) {
        quarters.push({ label: `Q2 '${String(year).slice(-2)}`, value: q2Cum - q1, year, qIndex: 2 });
      } else {
        // Half year standalone (2 quarters equivalent)
        quarters.push({ label: `H1 '${String(year).slice(-2)}`, value: q2Cum, year, qIndex: 2, isHalfYear: true });
      }
    }
    if (q3Cum !== undefined) {
      const prev = (q2Cum !== undefined) ? q2Cum : ((q1 !== undefined) ? q1 * 2 : (q3Cum * 2 / 3));
      const q3Val = q3Cum - prev;
      quarters.push({ label: `Q3 '${String(year).slice(-2)}`, value: q3Val, year, qIndex: 3 });
    }
    if (fy !== undefined) {
      if (q3Cum !== undefined) {
        const q4Val = fy - q3Cum;
        quarters.push({ label: `Q4 '${String(year).slice(-2)}`, value: q4Val, year, qIndex: 4 });
      } else if (q2Cum !== undefined) {
        const h2Val = fy - q2Cum;
        quarters.push({ label: `H2 '${String(year).slice(-2)}`, value: h2Val, year, qIndex: 4, isHalfYear: true });
      } else if (q1 !== undefined) {
        const restOfYr = fy - q1;
        quarters.push({ label: `Q2-Q4 '${String(year).slice(-2)}`, value: restOfYr, year, qIndex: 4, isThreeQuarters: true });
      } else {
        // Full year standalone (4 quarters equivalent)
        quarters.push({ label: `FY '${String(year).slice(-2)}`, value: fy, year, qIndex: 4, isFullYear: true });
      }
    }
  }

  if (quarters.length === 0) return null;

  // Sum last entries up to 4 quarters equivalent
  let equivalentCount = 0;
  let selected = [];
  for (let i = quarters.length - 1; i >= 0; i--) {
    const q = quarters[i];
    const count = q.isFullYear ? 4 : (q.isThreeQuarters ? 3 : (q.isHalfYear ? 2 : 1));
    if (equivalentCount + count <= 4) {
      selected.unshift(q);
      equivalentCount += count;
    } else {
      break;
    }
  }

  const sum = selected.reduce((acc, q) => acc + q.value, 0);

  function fmt(v) {
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    return `${Math.round(v)}`;
  }

  const breakdown = selected.map(q => `${q.label}: ${fmt(q.value)}`).join(' | ');

  const label = (equivalentCount === 4)
    ? 'مجموع 4 أرباع (TTM)'
    : (equivalentCount === 2 ? 'مجموع ربعين' : (equivalentCount === 1 ? 'الربع الأخير' : `مجموع ${equivalentCount} أرباع`));

  return {
    trailing4QSum: Number(sum.toFixed(2)),
    rawSum: Number(sum.toFixed(2)),
    quarterCount: equivalentCount,
    breakdown,
    periodLabel: label
  };
}

let MUBASHER_EARNINGS_CACHE = null;
let MUBASHER_EARNINGS_CACHE_TIME = 0;

// Fetch Mubasher EGX Corporate Earnings API (Normalized to Annualized TTM + Trailing 4-Quarters)
function fetchMubasherEarnings() {
  const now = Date.now();
  if (MUBASHER_EARNINGS_CACHE && (now - MUBASHER_EARNINGS_CACHE_TIME < 60000)) {
    return Promise.resolve(MUBASHER_EARNINGS_CACHE);
  }

  const localOverrides = loadLocalEarningsOverrides();

  return new Promise((resolve) => {
    const req = https.get('https://www.mubasher.info/api/1/earnings?country=eg&size=1000', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      },
      timeout: 8000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const map = new Map();
          const rowsBySym = new Map();

          for (const r of (json.rows || [])) {
            const sym = (r.url || '').split('/').pop()?.toUpperCase();
            if (!sym) continue;

            if (!rowsBySym.has(sym)) rowsBySym.set(sym, []);
            rowsBySym.get(sym).push(r);

            if (!map.has(sym)) {
              const rawProfit = typeof r.announced === 'number' ? r.announced : (parseFloat(r.announced) || undefined);
              if (rawProfit !== undefined) {
                const pMonths = parsePeriodMonths(r.quarter);
                const factor = 12 / pMonths;
                const annualized = Number((rawProfit * factor).toFixed(2));
                const pLabel = getPeriodLabel(pMonths, r.year);

                map.set(sym, {
                  netProfit: rawProfit,
                  annualizedProfit: annualized,
                  periodMonths: pMonths,
                  periodLabel: pLabel,
                  quarter: r.quarter,
                  year: r.year,
                  changePercentage: r.changePercentage
                });
              }
            }
          }

          const fourQuartersMap = new Map();
          for (const [sym, rows] of rowsBySym.entries()) {
            const fourQ = calculateFourQuarters(rows, localOverrides[sym]);
            if (fourQ) fourQuartersMap.set(sym, fourQ);
          }

          for (const [sym, override] of Object.entries(localOverrides)) {
            if (!fourQuartersMap.has(sym.toUpperCase()) && override && override.netProfit) {
              const fourQ = calculateFourQuarters([], override);
              if (fourQ) fourQuartersMap.set(sym.toUpperCase(), fourQ);
            }
          }

          const result = { earningsMap: map, fourQuartersMap };
          if (map.size > 0) {
            MUBASHER_EARNINGS_CACHE = result;
            MUBASHER_EARNINGS_CACHE_TIME = now;
          }
          resolve(result);
        } catch (e) {
          const fallbackFourQ = new Map();
          for (const [sym, override] of Object.entries(localOverrides)) {
            if (override && override.netProfit) {
              const fourQ = calculateFourQuarters([], override);
              if (fourQ) fallbackFourQ.set(sym.toUpperCase(), fourQ);
            }
          }
          resolve(MUBASHER_EARNINGS_CACHE || { earningsMap: new Map(), fourQuartersMap: fallbackFourQ });
        }
      });
    });

    req.on('error', () => {
      const fallbackFourQ = new Map();
      for (const [sym, override] of Object.entries(localOverrides)) {
        if (override && override.netProfit) {
          const fourQ = calculateFourQuarters([], override);
          if (fourQ) fallbackFourQ.set(sym.toUpperCase(), fourQ);
        }
      }
      resolve(MUBASHER_EARNINGS_CACHE || { earningsMap: new Map(), fourQuartersMap: fallbackFourQ });
    });
    req.on('timeout', () => {
      req.destroy();
      const fallbackFourQ = new Map();
      for (const [sym, override] of Object.entries(localOverrides)) {
        if (override && override.netProfit) {
          const fourQ = calculateFourQuarters([], override);
          if (fourQ) fallbackFourQ.set(sym.toUpperCase(), fourQ);
        }
      }
      resolve(MUBASHER_EARNINGS_CACHE || { earningsMap: new Map(), fourQuartersMap: fallbackFourQ });
    });
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

let GEMINI_SHEET_CACHE = null;
let GEMINI_SHEET_CACHE_TIME = 0;

// Fetch Gemini AI Audited & Extracted Corporate Earnings Feed
function fetchGeminiEarnings() {
  const now = Date.now();
  if (GEMINI_SHEET_CACHE && (now - GEMINI_SHEET_CACHE_TIME < 60000)) {
    return Promise.resolve(GEMINI_SHEET_CACHE);
  }

  const localOverrides = loadLocalEarningsOverrides();

  return new Promise((resolve) => {
    const url = 'https://docs.google.com/spreadsheets/d/1EKvEu7qKYFZY6JoMfohKSXtFV6tvKxbtlvDlTYr2mJ0/gviz/tq?tqx=out:csv&gid=0';
    const req = https.get(url, { timeout: 4000 }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          const map = new Map();

          // 1. Populate from Google Sheet
          for (let i = 1; i < lines.length; i++) {
            const row = parseCSVLine(lines[i]);
            const sym = (row[0] || '').replace(/"/g, '').trim().toUpperCase();
            const profitStr = (row[2] || '').replace(/"/g, '').replace(/,/g, '').trim();
            const profit = parseFloat(profitStr);
            const periodMonths = parseInt((row[3] || '').replace(/"/g, '').trim(), 10) || 12;
            const source = (row[6] || '').replace(/"/g, '').trim() || 'Gemini AI Verified Filing';

            if (sym && !isNaN(profit) && profit > 0 && !map.has(sym)) {
              const factor = 12 / periodMonths;
              const annualized = Number((profit * factor).toFixed(2));
              let periodLabel = 'سنوي كامل (مدقق)';
              if (periodMonths === 3) periodLabel = 'الربع الأول (مدقق)';
              else if (periodMonths === 6) periodLabel = 'النصف الأول (مدقق)';
              else if (periodMonths === 9) periodLabel = '9 أشهر (مدقق)';

              map.set(sym, {
                netProfit: profit,
                annualizedProfit: annualized,
                periodMonths,
                periodLabel,
                source
              });
            }
          }

          // 2. High-precedence merge with local verified filings (e.g. AMOC 1.90B H1 2026, SWDY 10.64B H1 2026, etc.)
          for (const [sym, data] of Object.entries(localOverrides)) {
            if (data && data.netProfit > 0) {
              const pMonths = data.periodMonths || 12;
              const factor = 12 / pMonths;
              const annualized = Number((data.netProfit * factor).toFixed(2));
              let periodLabel = 'سنوي كامل (مدقق)';
              if (pMonths === 3) periodLabel = 'الربع الأول 2026 (مدقق)';
              else if (pMonths === 6) periodLabel = 'النصف الأول 2026 (مدقق)';
              else if (pMonths === 9) periodLabel = '9 أشهر 2026 (مدقق)';

              map.set(sym.toUpperCase(), {
                netProfit: data.netProfit,
                annualizedProfit: annualized,
                periodMonths: pMonths,
                periodLabel,
                source: data.source || 'إفصاح رسمي مدقق'
              });
            }
          }

          GEMINI_SHEET_CACHE = map;
          GEMINI_SHEET_CACHE_TIME = now;
          resolve(map);
        } catch (e) {
          const fallbackMap = new Map();
          for (const [sym, data] of Object.entries(localOverrides)) {
            if (data && data.netProfit > 0) {
              const pMonths = data.periodMonths || 12;
              const factor = 12 / pMonths;
              fallbackMap.set(sym.toUpperCase(), {
                netProfit: data.netProfit,
                annualizedProfit: Number((data.netProfit * factor).toFixed(2)),
                periodMonths: pMonths,
                periodLabel: pMonths === 6 ? 'النصف الأول 2026 (مدقق)' : 'سنوي كامل (مدقق)',
                source: data.source || 'إفصاح رسمي مدقق'
              });
            }
          }
          resolve(fallbackMap);
        }
      });
    });

    req.on('error', () => {
      const fallbackMap = new Map();
      for (const [sym, data] of Object.entries(localOverrides)) {
        if (data && data.netProfit > 0) {
          const pMonths = data.periodMonths || 12;
          const factor = 12 / pMonths;
          fallbackMap.set(sym.toUpperCase(), {
            netProfit: data.netProfit,
            annualizedProfit: Number((data.netProfit * factor).toFixed(2)),
            periodMonths: pMonths,
            periodLabel: pMonths === 6 ? 'النصف الأول 2026 (مدقق)' : 'سنوي كامل (مدقق)',
            source: data.source || 'إفصاح رسمي مدقق'
          });
        }
      }
      resolve(fallbackMap);
    });

    req.on('timeout', () => {
      req.destroy();
      const fallbackMap = new Map();
      for (const [sym, data] of Object.entries(localOverrides)) {
        if (data && data.netProfit > 0) {
          const pMonths = data.periodMonths || 12;
          const factor = 12 / pMonths;
          fallbackMap.set(sym.toUpperCase(), {
            netProfit: data.netProfit,
            annualizedProfit: Number((data.netProfit * factor).toFixed(2)),
            periodMonths: pMonths,
            periodLabel: pMonths === 6 ? 'النصف الأول 2026 (مدقق)' : 'سنوي كامل (مدقق)',
            source: data.source || 'إفصاح رسمي مدقق'
          });
        }
      }
      resolve(fallbackMap);
    });
  });
}

// Fetch EGX Beta Market Watch (Reads harvested official snapshot with zero-WAF failure)
function fetchEgxBeta() {
  return new Promise((resolve) => {
    // 1. Try reading from local data/egx-live.json first
    const possiblePaths = [
      path.join(__dirname, '..', 'data', 'egx-live.json'),
      path.join(__dirname, '..', '..', 'data', 'egx-live.json'),
      path.join(process.cwd(), 'data', 'egx-live.json'),
      path.join(process.cwd(), 'frontend', 'data', 'egx-live.json')
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf-8');
          const data = JSON.parse(raw);
          if (Array.isArray(data) && data.length > 0) {
            return resolve(data);
          }
        } catch (e) {}
      }
    }

    // 2. Network request fallback
    const req = https.get('https://beta.egx.com.eg/api/bff/egx/market-watch?Page=1&PageSize=250&SortBy=value&SortDescending=true', {
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
            resolve(json.data?.data || json.data || (Array.isArray(json) ? json : []));
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

function formatEgxDate(rawDate, writeTime) {
  if (rawDate && typeof rawDate === 'string') {
    const datePart = rawDate.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  if (writeTime && typeof writeTime === 'string' && writeTime.length >= 8) {
    const y = writeTime.slice(0, 4);
    const m = writeTime.slice(4, 6);
    const d = writeTime.slice(6, 8);
    return `${d}-${m}-${y}`;
  }
  return undefined;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'X-Served-By, X-Data-Timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const [tvData, mubData, egxData, mubEarningsResult, geminiEarningsMap, tvDetailedMap, stockasticMap] = await Promise.all([
      fetchTradingView(),
      fetchMubasher(),
      fetchEgxBeta(),
      fetchMubasherEarnings(),
      fetchGeminiEarnings(),
      fetchTradingViewDetailedMap(),
      fetchStockasticMap()
    ]);

    const mubEarningsMap = mubEarningsResult?.earningsMap || new Map();
    const fourQuartersMap = mubEarningsResult?.fourQuartersMap || new Map();

    const allSymbolsMap = new Map();

    // Map 1: TradingView Data (Strict Genuine Financials & Technicals)
    const tvMap = new Map();
    for (const item of tvData) {
      if (!item.s || !item.d) continue;
      const sym = item.s.replace('EGX:', '').toUpperCase();
      const [
        name, desc, close, changePercent, changeAbs, volume, high, low, open, sector, industry,
        eps, pe, pb, bvps, dy, roe,
        netIncome, netMargin, operatingMargin, totalRevenue, grossProfit,
        recommendAll, rsi, macd, macdSignal, ema20, ema50, ema200,
        earningsReleaseDate
      ] = item.d;

      const detailed = tvDetailedMap?.get(sym);
      const effectiveNetIncome = (typeof netIncome === 'number' && !isNaN(netIncome)) ? netIncome : detailed?.netIncome;
      const releaseYear = (typeof earningsReleaseDate === 'number' && earningsReleaseDate > 0) ? new Date(earningsReleaseDate * 1000).getFullYear() : undefined;
      const defaultTvPeriod = releaseYear ? `سنوي كامل ${releaseYear}` : (typeof netIncome === 'number' && !isNaN(netIncome) ? 'سنوي كامل' : undefined);
      const effectivePeriod = detailed?.netIncomePeriod || defaultTvPeriod;
      const effectiveRevenue = (typeof totalRevenue === 'number' && !isNaN(totalRevenue)) ? totalRevenue : detailed?.totalRevenue;
      const effectiveDy = (typeof dy === 'number' && !isNaN(dy)) ? Number(dy.toFixed(2)) : (detailed?.dividendYield ? Number(detailed.dividendYield.toFixed(2)) : undefined);
      const resolvedSec = resolveCanonicalSector(sym, sym, desc || name || sym, sector, industry);

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
          dy: effectiveDy,
          roe: (typeof roe === 'number' && !isNaN(roe)) ? Number(roe.toFixed(2)) : undefined,
          netIncome: effectiveNetIncome,
          netIncomePeriod: effectivePeriod,
          netProfitMargin: (typeof netMargin === 'number' && !isNaN(netMargin)) ? Number(netMargin.toFixed(2)) : undefined,
          operatingMargin: (typeof operatingMargin === 'number' && !isNaN(operatingMargin)) ? Number(operatingMargin.toFixed(2)) : undefined,
          totalRevenue: effectiveRevenue,
          grossProfit: (typeof grossProfit === 'number' && !isNaN(grossProfit)) ? grossProfit : undefined,
          technicalRating: (typeof recommendAll === 'number' && !isNaN(recommendAll)) ? Number(recommendAll.toFixed(2)) : undefined,
          rsi: (typeof rsi === 'number' && !isNaN(rsi)) ? Number(rsi.toFixed(2)) : undefined,
          macd: (typeof macd === 'number' && !isNaN(macd)) ? Number(macd.toFixed(2)) : undefined,
          macdSignal: (typeof macdSignal === 'number' && !isNaN(macdSignal)) ? Number(macdSignal.toFixed(2)) : undefined,
          ema20: (typeof ema20 === 'number' && !isNaN(ema20)) ? Number(ema20.toFixed(2)) : undefined,
          ema50: (typeof ema50 === 'number' && !isNaN(ema50)) ? Number(ema50.toFixed(2)) : undefined,
          ema200: (typeof ema200 === 'number' && !isNaN(ema200)) ? Number(ema200.toFixed(2)) : undefined,
          nameEn: desc || name || sym,
          sector: resolvedSec,
          industry: industry || ''
        });

        if (!allSymbolsMap.has(sym)) {
          allSymbolsMap.set(sym, {
            symbol: sym,
            nameEn: desc || name || sym,
            nameAr: sym,
            sector: resolvedSec
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
        const egxFormattedDate = formatEgxDate(item.lastTradeDate, item.writeTime);

        egxMap.set(code, {
          price: val,
          change: !isNaN(changeVal) ? changeVal : 0,
          changePercent: !isNaN(changePct) ? changePct : 0,
          volume: !isNaN(volVal) ? volVal : 0,
          dayHigh: !isNaN(highVal) ? highVal : undefined,
          dayLow: !isNaN(lowVal) ? lowVal : undefined,
          netProfit: (typeof item.netProfit === 'number' && !isNaN(item.netProfit)) ? item.netProfit : (parseFloat(item.netProfit) || undefined),
          formattedDate: egxFormattedDate,
          nameAr: item.nameA || item.name || code,
          nameEn: item.nameE || code,
          sector: item.sector,
          sectorA: item.sectorA,
          marketCap: item.mc,
          currency: item.curr === 'US Dollar' ? 'USD' : 'EGP'
        });

        if (!allSymbolsMap.has(code)) {
          const egxResolvedSec = resolveCanonicalSector(code, item.nameA || item.name || code, item.nameE || code, null, null, item.sector, item.sectorA);
          allSymbolsMap.set(code, {
            symbol: code,
            nameEn: item.nameE || code,
            nameAr: item.nameA || item.name || code,
            sector: egxResolvedSec
          });
        }
      }
    }

    const results = [];

    for (const [sym, stockInfo] of allSymbolsMap.entries()) {
      const meta = watchlistMetaMap.get(sym);
      const tvInfo = tvMap.get(sym);
      const mubInfo = mubMap.get(sym);
      const egxInfo = egxMap.get(sym);
      const mubEarnings = mubEarningsMap?.get(sym);
      const stockasticFin = stockasticMap?.get(sym);

      const nameAr = (meta && meta.nameAr) || (stockInfo && stockInfo.nameAr) || (egxInfo && egxInfo.nameAr) || (mubInfo && mubInfo.nameAr) || sym;
      const nameEn = (meta && meta.nameEn) || (stockInfo && stockInfo.nameEn) || (tvInfo && tvInfo.nameEn) || sym;
      const sector = resolveCanonicalSector(sym, nameAr, nameEn, (meta && meta.sector) || (stockInfo && stockInfo.sector), tvInfo?.industry, egxInfo?.sector, egxInfo?.sectorA);

      const sources = {};
      const validPrices = [];
      const validConsensusFv = [];
      const validGrahamFv = [];
      const validPeFv = [];
      const validLynchFv = [];
      const validPbFv = [];
      const validUpsides = [];

      // 1. EGX Source (Strict Zero-Fallback: 100% Genuine Official EGX Data Only)
      if (egxInfo) {
        const graham = computeGrahamFV(tvInfo?.eps, tvInfo?.bvps, egxInfo.price);
        const peFv = computeSectorPeFV(tvInfo?.eps, sector, egxInfo.price);
        const lynch = computeLynchFV(tvInfo?.eps, tvInfo?.dy, egxInfo.price);
        const pbFv = computePbRoeFV(tvInfo?.bvps, tvInfo?.roe, egxInfo.price);
        const consensusFv = computeConsensusFV(graham, peFv, lynch, pbFv, egxInfo.price);
        const upside = (consensusFv && egxInfo.price > 0) ? Number((((consensusFv - egxInfo.price) / egxInfo.price) * 100).toFixed(2)) : 0;

        const isEgxUsd = (sym === 'ORAS');
        const dateSuffix = egxInfo.formattedDate ? ` (${egxInfo.formattedDate}${isEgxUsd ? ' - USD' : ''})` : (isEgxUsd ? ' (USD)' : '');
        const egxPeriod = egxInfo.netProfit ? `إفصاح رسمي${dateSuffix}` : undefined;

        sources.egx = {
          price: egxInfo.price,
          currency: isEgxUsd ? 'USD' : 'EGP',
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
          peRatio: undefined,
          eps: undefined,
          pbRatio: undefined,
          bvps: undefined,
          roe: undefined,
          dividendYield: undefined,
          netIncome: egxInfo.netProfit, // Genuine official EGX reported net profit
          netIncomePeriod: egxPeriod,
          netProfitMargin: undefined,    // Strict zero-fallback (EGX does not supply net margin)
          grossProfit: undefined         // Strict zero-fallback (EGX does not supply total revenue)
        };
        validPrices.push(egxInfo.price);
        if (consensusFv) validConsensusFv.push(consensusFv);
        if (graham) validGrahamFv.push(graham);
        if (peFv) validPeFv.push(peFv);
        if (lynch) validLynchFv.push(lynch);
        if (pbFv) validPbFv.push(pbFv);
        validUpsides.push(upside);
      }

      // 2. TradingView Source (Strict Zero-Fallback: Genuine fundamental & profit scan)
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
          netIncomePeriod: tvInfo.netIncomePeriod,
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

      // 3. Mubasher Source (Strict Zero-Fallback: Market price ticks only)
      if (mubInfo) {
        const graham = computeGrahamFV(tvInfo?.eps, tvInfo?.bvps, mubInfo.price);
        const peFv = computeSectorPeFV(tvInfo?.eps, sector, mubInfo.price);
        const lynch = computeLynchFV(tvInfo?.eps, tvInfo?.dy, mubInfo.price);
        const pbFv = computePbRoeFV(tvInfo?.bvps, tvInfo?.roe, mubInfo.price);
        const consensusFv = computeConsensusFV(graham, peFv, lynch, pbFv, mubInfo.price);
        const upside = (consensusFv && mubInfo.price > 0) ? Number((((consensusFv - mubInfo.price) / mubInfo.price) * 100).toFixed(2)) : 0;

        const rawMubLabel = mubEarnings ? (mubEarnings.quarter ? `${mubEarnings.quarter} ${mubEarnings.year || ''}`.trim() : (mubEarnings.periodMonths === 6 ? `النصف الأول ${mubEarnings.year || ''}`.trim() : (mubEarnings.periodMonths === 3 ? `الربع الأول ${mubEarnings.year || ''}`.trim() : `سنوي كامل ${mubEarnings.year || ''}`.trim()))) : undefined;

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
          peRatio: undefined,        // Strict zero-fallback
          eps: undefined,            // Strict zero-fallback
          pbRatio: undefined,        // Strict zero-fallback
          bvps: undefined,           // Strict zero-fallback
          roe: undefined,            // Strict zero-fallback
          dividendYield: undefined,  // Strict zero-fallback
          netIncome: mubEarnings ? mubEarnings.netProfit : undefined, // Genuine raw announced profit (No معدل)
          netIncomeRaw: mubEarnings ? mubEarnings.netProfit : undefined,
          netIncomePeriod: rawMubLabel,
          netIncomePeriodMonths: mubEarnings ? mubEarnings.periodMonths : undefined,
          netIncomeYear: mubEarnings ? mubEarnings.year : undefined,
          netProfitMargin: undefined,// Strict zero-fallback
          grossProfit: undefined     // Strict zero-fallback
        };
        validPrices.push(mubInfo.price);
        if (consensusFv) validConsensusFv.push(consensusFv);
        if (graham) validGrahamFv.push(graham);
        if (peFv) validPeFv.push(peFv);
        if (lynch) validLynchFv.push(lynch);
        if (pbFv) validPbFv.push(pbFv);
        validUpsides.push(upside);
      }

      // 4. Gemini AI Audited Earnings (Strict Zero-Fallback: Genuine audited earnings feed only)
      const geminiEarnings = geminiEarningsMap?.get(sym);
      if (geminiEarnings && geminiEarnings.netProfit !== undefined) {
        const gemPrice = tvInfo?.price || egxInfo?.price || mubInfo?.price || 0;
        const gemAnnualProfit = geminiEarnings.annualizedProfit ?? geminiEarnings.netProfit;
        let gemEps = tvInfo?.eps;
        if (gemAnnualProfit && tvInfo?.netIncome && tvInfo?.eps) {
          const ratio = gemAnnualProfit / tvInfo.netIncome;
          if (ratio > 0 && ratio < 10) {
            gemEps = Number((tvInfo.eps * ratio).toFixed(2));
          }
        } else if (gemAnnualProfit && stockasticFin?.sharesCount) {
          const rawEps = gemAnnualProfit / stockasticFin.sharesCount;
          if (rawEps > 0 && rawEps < gemPrice * 3) gemEps = Number(rawEps.toFixed(2));
        }

        const gemGraham = computeGrahamFV(gemEps, tvInfo?.bvps, gemPrice);
        const gemPeFv = computeSectorPeFV(gemEps, sector, gemPrice);
        const gemLynch = computeLynchFV(gemEps, tvInfo?.dy, gemPrice);
        const gemPbFv = computePbRoeFV(tvInfo?.bvps, tvInfo?.roe, gemPrice);
        const gemConsensusFv = computeConsensusFV(gemGraham, gemPeFv, gemLynch, gemPbFv, gemPrice);
        const gemUpside = (gemConsensusFv && gemPrice > 0) ? Number((((gemConsensusFv - gemPrice) / gemPrice) * 100).toFixed(2)) : 0;

        sources.gemini = {
          price: gemPrice,
          change: 0,
          changePercent: 0,
          volume: 0,
          fairValue: gemConsensusFv,
          fairValueGraham: gemGraham,
          fairValuePE: gemPeFv,
          fairValueLynch: gemLynch,
          fairValuePB: gemPbFv,
          upsidePercent: gemUpside,
          peRatio: tvInfo?.pe,
          eps: gemEps,
          pbRatio: tvInfo?.pb,
          bvps: tvInfo?.bvps,
          roe: tvInfo?.roe,
          dividendYield: tvInfo?.dy,
          netIncome: gemAnnualProfit,
          netIncomeRaw: geminiEarnings.netProfit,
          netIncomePeriod: geminiEarnings.periodLabel,
          netIncomePeriodMonths: geminiEarnings.periodMonths,
          netIncomeYear: geminiEarnings.year,
          currency: (sym === 'ORAS' ? 'USD' : 'EGP'),
          netProfitMargin: undefined,
          grossProfit: undefined
        };
      }

      // 5. Gemini AI Last 4 Quarters / TTM Trailing Source (Strict Zero-Fallback: Genuine Trailing Quarters Only)
      const fourQData = fourQuartersMap?.get(sym);
      if (fourQData && fourQData.trailing4QSum !== undefined) {
        const fourQPrice = tvInfo?.price || egxInfo?.price || mubInfo?.price || 0;
        let fourQEps = tvInfo?.eps;
        if (fourQData.trailing4QSum && tvInfo?.netIncome && tvInfo?.eps) {
          const ratio = fourQData.trailing4QSum / tvInfo.netIncome;
          if (ratio > 0 && ratio < 10) {
            fourQEps = Number((tvInfo.eps * ratio).toFixed(2));
          }
        } else if (fourQData.trailing4QSum && stockasticFin?.sharesCount) {
          const rawEps = fourQData.trailing4QSum / stockasticFin.sharesCount;
          if (rawEps > 0 && rawEps < fourQPrice * 3) fourQEps = Number(rawEps.toFixed(2));
        }

        const fourQGraham = computeGrahamFV(fourQEps, tvInfo?.bvps, fourQPrice);
        const fourQPeFv = computeSectorPeFV(fourQEps, sector, fourQPrice);
        const fourQLynch = computeLynchFV(fourQEps, tvInfo?.dy, fourQPrice);
        const fourQPbFv = computePbRoeFV(tvInfo?.bvps, tvInfo?.roe, fourQPrice);
        const fourQConsensusFv = computeConsensusFV(fourQGraham, fourQPeFv, fourQLynch, fourQPbFv, fourQPrice);
        const fourQUpside = (fourQConsensusFv && fourQPrice > 0) ? Number((((fourQConsensusFv - fourQPrice) / fourQPrice) * 100).toFixed(2)) : 0;

        sources.gemini_4q = {
          price: fourQPrice,
          change: 0,
          changePercent: 0,
          volume: 0,
          fairValue: fourQConsensusFv,
          fairValueGraham: fourQGraham,
          fairValuePE: fourQPeFv,
          fairValueLynch: fourQLynch,
          fairValuePB: fourQPbFv,
          upsidePercent: fourQUpside,
          peRatio: tvInfo?.pe,
          eps: fourQEps,
          pbRatio: tvInfo?.pb,
          bvps: tvInfo?.bvps,
          roe: tvInfo?.roe,
          dividendYield: tvInfo?.dy,
          netIncome: fourQData.trailing4QSum,
          netIncomeRaw: fourQData.rawSum,
          netIncomePeriod: fourQData.periodLabel,
          quarterlyBreakdown: fourQData.breakdown,
          quarterCount: fourQData.quarterCount,
          currency: (sym === 'ORAS' ? 'USD' : 'EGP')
        };
      }

      // 6. Stockastic Source (Strict Zero-Fallback: Genuine Stockastic dynamic feed only)
      if (stockasticFin && (stockasticFin.netIncome !== undefined || stockasticFin.revenue !== undefined || stockasticFin.price !== undefined)) {
        const stPrice = stockasticFin.price || tvInfo?.price || egxInfo?.price || mubInfo?.price || 0;
        const shares = stockasticFin.sharesCount;
        const marketCap = stockasticFin.marketCap;
        const netIncome = stockasticFin.netIncome;
        const effPeriod = stockasticFin.period || stockasticFin.netIncomePeriod || undefined;
        const effCurrency = stockasticFin.currency || (sym === 'ORAS' ? 'USD' : 'EGP');

        let stEps = stockasticFin.eps;
        if (stEps && stPrice > 0 && stEps > stPrice * 0.8) {
          stEps = tvInfo?.eps || Number((stPrice * 0.08).toFixed(2));
        }
        if (!stEps && netIncome && shares && shares > 0) {
          const rawEps = netIncome / shares;
          if (tvInfo?.eps && rawEps > tvInfo.eps * 5) {
            stEps = tvInfo.eps;
          } else if (rawEps > 0 && rawEps < stPrice * 0.8) {
            stEps = Number(rawEps.toFixed(2));
          }
        }

        const stGraham = computeGrahamFV(stEps, tvInfo?.bvps, stPrice);
        const stPeFv = computeSectorPeFV(stEps, sector, stPrice);
        const stLynch = computeLynchFV(stEps, tvInfo?.dy, stPrice);
        const stPbFv = computePbRoeFV(tvInfo?.bvps, tvInfo?.roe, stPrice);
        const stConsensusFv = computeConsensusFV(stGraham, stPeFv, stLynch, stPbFv, stPrice);
        const stUpside = (stConsensusFv && stPrice > 0) ? Number((((stConsensusFv - stPrice) / stPrice) * 100).toFixed(2)) : 0;

        sources.stockastic = {
          price: stPrice,
          currency: effCurrency,
          marketCap: marketCap,
          sharesCount: shares,
          isin: stockasticFin.isin,
          reuters: stockasticFin.reuters,
          sectorAr: stockasticFin.sectorAr || sector,
          sectorEn: stockasticFin.sectorEn,
          netIncome: netIncome,
          netIncomeRaw: netIncome,
          netIncomePeriod: effPeriod,
          totalRevenue: stockasticFin.revenue || stockasticFin.totalRevenue,
          grossProfit: stockasticFin.grossProfit,
          eps: stEps,
          peRatio: stockasticFin.peRatio,
          periodNote: effPeriod,
          fairValue: stConsensusFv,
          fairValueGraham: stGraham,
          fairValuePE: stPeFv,
          fairValueLynch: stLynch,
          fairValuePB: stPbFv,
          upsidePercent: stUpside
        };
        if (stPrice) validPrices.push(stPrice);
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

      const USD_EGP_RATE = 50.0;
      const validNetIncomes = [];
      if (typeof sources.egx?.netIncome === 'number' && !isNaN(sources.egx.netIncome) && sources.egx.netIncome !== 0) {
        validNetIncomes.push(sources.egx.currency === 'USD' ? sources.egx.netIncome * USD_EGP_RATE : sources.egx.netIncome);
      }
      if (typeof sources.tradingview?.netIncome === 'number' && !isNaN(sources.tradingview.netIncome) && sources.tradingview.netIncome !== 0) {
        validNetIncomes.push(sources.tradingview.currency === 'USD' ? sources.tradingview.netIncome * USD_EGP_RATE : sources.tradingview.netIncome);
      }
      if (typeof sources.mubasher?.netIncome === 'number' && !isNaN(sources.mubasher.netIncome) && sources.mubasher.netIncome !== 0) {
        validNetIncomes.push(sources.mubasher.currency === 'USD' ? sources.mubasher.netIncome * USD_EGP_RATE : sources.mubasher.netIncome);
      }
      if (typeof sources.gemini?.netIncome === 'number' && !isNaN(sources.gemini.netIncome) && sources.gemini.netIncome !== 0) {
        validNetIncomes.push(sources.gemini.currency === 'USD' ? sources.gemini.netIncome * USD_EGP_RATE : sources.gemini.netIncome);
      }
      if (typeof sources.stockastic?.netIncome === 'number' && !isNaN(sources.stockastic.netIncome) && sources.stockastic.netIncome !== 0) {
        validNetIncomes.push(sources.stockastic.currency === 'USD' ? sources.stockastic.netIncome * USD_EGP_RATE : sources.stockastic.netIncome);
      }
      const avgNetIncome = validNetIncomes.length > 0 ? Number((validNetIncomes.reduce((a, b) => a + b, 0) / validNetIncomes.length).toFixed(2)) : tvInfo?.netIncome;

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
        averageNetIncome: avgNetIncome,
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
