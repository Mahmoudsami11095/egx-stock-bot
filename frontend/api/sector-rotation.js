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
  'LUTS': 'Food & Beverage',
  'OFH': 'Non-Banking Financial Services',
  'AIDC': 'Non-Banking Financial Services',
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
  if (sym && CANONICAL_STOCK_SECTORS[sym.toUpperCase()]) {
    return CANONICAL_STOCK_SECTORS[sym.toUpperCase()];
  }

  if (egxSector && EGX_OFFICIAL_SECTOR_MAP[egxSector]) {
    return EGX_OFFICIAL_SECTOR_MAP[egxSector];
  }
  if (egxSectorA && EGX_OFFICIAL_SECTOR_MAP[egxSectorA]) {
    return EGX_OFFICIAL_SECTOR_MAP[egxSectorA];
  }

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

  if (tvSector && tvSector !== 'Finance' && tvSector !== 'General') return tvSector;

  return 'General';
}

const SECTOR_ARABIC_MAP = {
  'Real Estate': { ar: '🏠 العقارات والتطوير العمراني', icon: '🏠', category: 'REAL_ESTATE' },
  'Banks': { ar: '🏦 البنوك والقطاع المصرفي', icon: '🏦', category: 'FINANCIAL' },
  'Non-Banking Financial Services': { ar: '💼 الخدمات المالية غير المصرفية والاستثمار', icon: '💼', category: 'FINANCIAL' },
  'Insurance': { ar: '🛡️ التأمين وإدارة المخاطر', icon: '🛡️', category: 'FINANCIAL' },
  'Building Materials': { ar: '🧱 مواد البناء والتشييد والحديد', icon: '🧱', category: 'MATERIALS' },
  'Construction': { ar: '🏗️ المقاولات والإنشاءات الهندسية', icon: '🏗️', category: 'SERVICES' },
  'Food & Beverage': { ar: '🛒 الأغذية والمشروبات والمطاحن', icon: '🛒', category: 'CONSUMER' },
  'Pharmaceuticals': { ar: '💊 الأدوية والرعاية الصحية', icon: '💊', category: 'HEALTHCARE' },
  'Healthcare': { ar: '🏥 المستشفيات والخدمات الطبية', icon: '🏥', category: 'HEALTHCARE' },
  'Petrochemicals & Fertilizers': { ar: '🧪 البتروكيماويات والأسمدة والكيماويات', icon: '🧪', category: 'INDUSTRIAL' },
  'Petrochemicals': { ar: '🧪 البتروكيماويات والكيماويات', icon: '🧪', category: 'INDUSTRIAL' },
  'Fertilizers': { ar: '🌱 الأسمدة والكيماويات الزراعية', icon: '🌱', category: 'INDUSTRIAL' },
  'Oil & Gas': { ar: '⛽ الطاقة والبترول والغاز', icon: '⛽', category: 'ENERGY' },
  'Industrial Cables & Energy': { ar: '🔌 الكابلات والمنتجات الصناعية والطاقة', icon: '🔌', category: 'INDUSTRIAL' },
  'Basic Resources': { ar: '⛏️ الموارد الأساسية والتعدين', icon: '⛏️', category: 'MATERIALS' },
  'Telecommunications': { ar: '📡 الاتصالات وتكنولوجيا المعلومات', icon: '📡', category: 'TELECOM' },
  'Technology & FinTech': { ar: '💻 التكنولوجيا والمدفوعات الإلكترونية', icon: '💻', category: 'TECH' },
  'Shipping & Transportation': { ar: '🚢 النقل والشحن والخدمات اللوجستية', icon: '🚢', category: 'TRANSPORT' },
  'Tourism & Leisure': { ar: '🎭 السياحة والفنادق والترفيه', icon: '🎭', category: 'CONSUMER' },
  'Textiles & Consumer Goods': { ar: '🧵 المنسوجات والسلع الاستهلاكية المعمرة', icon: '🧵', category: 'CONSUMER' },
  'Consumer Goods': { ar: '🛍️ تجارة التجزئة والسلع الاستهلاكية', icon: '🛍️', category: 'CONSUMER' },
  'Consumer Services': { ar: '📚 الخدمات التعليمية وخدمات المستهلك', icon: '📚', category: 'CONSUMER' },
  'Utilities': { ar: '⚡ المرافق العامة والطاقة المتجددة', icon: '⚡', category: 'UTILITIES' },
  'Commercial Services': { ar: '🤝 الخدمات التجارية والاستشارية', icon: '🤝', category: 'SERVICES' },
  'Halal EGX': { ar: '🌿 الأسهم المتوافقة مع الشريعة', icon: '🌿', category: 'HOLDING' },
  'General': { ar: '📋 شركات قابضة واستثمارات عامة', icon: '📋', category: 'HOLDING' },
  'Unknown': { ar: '❓ أسهم أخرى غير مصنفة', icon: '❓', category: 'OTHER' }
};

const SECTOR_PE = {
  'Banks': 7.5,
  'Non-Banking Financial Services': 9.0,
  'Insurance': 8.0,
  'Real Estate': 10.0,
  'Construction': 8.5,
  'Building Materials': 8.0,
  'Petrochemicals & Fertilizers': 9.0,
  'Petrochemicals': 8.5,
  'Fertilizers': 9.5,
  'Oil & Gas': 8.5,
  'Food & Beverage': 12.0,
  'Pharmaceuticals': 11.0,
  'Healthcare': 12.5,
  'Consumer Goods': 10.0,
  'Textiles & Consumer Goods': 9.0,
  'Industrial Cables & Energy': 9.5,
  'Basic Resources': 7.0,
  'Telecommunications': 9.0,
  'Technology & FinTech': 14.0,
  'Shipping & Transportation': 8.5,
  'Tourism & Leisure': 11.0,
  'Utilities': 9.0,
  'Commercial Services': 9.0,
  'Consumer Services': 11.0,
  'Halal EGX': 9.0,
  'General': 9.0,
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
  if (typeof bvps !== 'number' || bvps <= 0) return undefined;
  const returnOnEquity = (typeof roe === 'number' && roe > 0) ? roe : 15.0;
  const targetPb = Math.min(Math.max(returnOnEquity / 10.0, 0.8), 3.5);
  const raw = bvps * targetPb;
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
        'average_volume_10d_calc', 'Value.Traded', 'high', 'low', 'open', 'sector', 'industry',
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

function fetchEgxBeta() {
  return new Promise((resolve) => {
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'X-Served-By, X-Data-Timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const [rawData, egxData] = await Promise.all([
      fetchTradingViewScan(),
      fetchEgxBeta()
    ]);

    const egxMap = new Map();
    for (const item of (egxData || [])) {
      const code = (item.reuters || item.isin || item.symbol || item.code || '').replace('.CA', '').toUpperCase();
      if (!code) continue;
      egxMap.set(code, item);
    }

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
        avgVol10d, valueTraded, high, low, open, rawSector, rawIndustry,
        eps, pe, pb, bvps, dy, roe, rsi, sma20, sma50, marketCap,
        netIncome, netMargin, operatingMargin, totalRevenue
      ] = item.d;

      if (typeof close !== 'number' || close <= 0) continue;

      const meta = watchlistMetaMap.get(sym);
      const egxInfo = egxMap.get(sym);
      const nameAr = (meta && meta.nameAr) || (egxInfo && egxInfo.nameA) || (egxInfo && egxInfo.name) || sym;
      const nameEn = (meta && meta.nameEn) || desc || (egxInfo && egxInfo.nameE) || name || sym;

      const sectorKey = resolveCanonicalSector(sym, nameAr, nameEn, rawSector, rawIndustry, egxInfo?.sector, egxInfo?.sectorA);

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
