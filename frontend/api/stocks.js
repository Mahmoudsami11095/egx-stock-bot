const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function fetchFromAzureVM(reqPath) {
  return new Promise((resolve) => {
    const req = http.get(`http://20.91.240.54:5000${reqPath}`, { timeout: 3500 }, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

const ISIN_SYMBOL_MAP = {
  'EGS72XL1C014': { symbol: 'PHGC', name: 'بريميوم هيلثكير جروب (PHGC)' },
  'EGS48271C018-EGP': { symbol: 'EGSA', name: 'مصر جنوب أفريقيا للاتصالات (EGSA)' }
};

const CONVENTIONAL_NON_HALAL = new Set([
  'COMI', 'CIEB', 'HDBK', 'EXPA', 'QNBA', 'EAST', 'SUGR', 'EKHO', 'SAIB'
]);

// Map of EGX symbols to Arabic search names for news scraping
const STOCK_ARABIC_NAMES = {
  "AALR": "for Land Reclamation & Reconstruction",
  "ABUK": "أبوقير للأسمدة والصناعات الكيماوية",
  "ACAMD": "for Asset Management &",
  "ACAP": "A Capital",
  "ACFR": "Alexandria For Refractories",
  "ACGC": "Cotton Ginning",
  "ACTF": "Act Financial",
  "ADCI": "Pharmaceuticals",
  "ADIB": "مصرف أبوظبي الإسلامي - مصر",
  "ADPC": "Dairy Products Dairy - Panda",
  "ADRI": "& Real Estate",
  "AFDI": "Alahly For &",
  "AFMC": "Alexandria Flour Mills",
  "AIDC": "ia for and",
  "AIFI": "Atlas for & Food SAE",
  "AIH": "ia s SAE",
  "AJWA": "Ajwa for Food",
  "ALCN": "Alexandria Containers & Goods",
  "ALEX": "Alexandria Cement",
  "ALUM": "Aluminum SAE",
  "AMER": "مجموعة عامر القابضة",
  "AMES": "Alexandria New Medical Center",
  "AMIA": "Moltaqa s",
  "AMII": "ian Metal and Industrial s",
  "AMOC": "الإسكندرية للزيوت المعدنية",
  "AMPI": "AL Moasher Pay for Electronic Payment and Collection ()",
  "ANCC": "ALNAHDA Industrial",
  "APPC": "Advanced Pharmaceutical Packaging",
  "APSW": "Polvara Spinning & Weaving",
  "ARAB": "Developers",
  "ARCC": "العربية للأسمنت",
  "AREH": "المجموعة المصرية العقارية",
  "ASCM": "ASEC for Mining",
  "ASPI": "Aspire Capital for Financial s",
  "ATLC": "Al Tawfeek Leasing -A.T.LEASE",
  "ATQA": "Misr Steel",
  "AXPH": "Alexandria for Pharmaceuticals and Chemical",
  "BIDI": "El Badr and - BID",
  "BIGP": "ElBarbary",
  "BINV": "بي إنفستمنتس القابضة",
  "BIOC": "جلاكسو سميثكلاين",
  "BONY": "Bonyan for and Trade",
  "BTFH": "Beltone",
  "CAED": "Cairo Educational Services",
  "CANA": "Suez Canal Bank SAE",
  "CCAP": "QALA For Financial s",
  "CCRS": "القاهرة للزيوت والصابون",
  "CEFM": "Middle Flour Mills",
  "CERA": "Ceramic - Ceramica Remas",
  "CFGH": "Concrete Fashion for Commercial and Industrial s",
  "CICH": "CI Capital for Financial s",
  "CID": "Chemical Dev Ind Egp10",
  "CIEB": "كريدي أجريكول مصر",
  "CIRA": "Cairo For And Real Estate s -CIRA Education",
  "CLHO": "مجموعة كليوباترا للمستشفيات",
  "CNFN": "Contact Financial SAE",
  "COMI": "البنك التجاري الدولي",
  "COPR": "Cooper for Commercial & Real Estate",
  "COSG": "Cairo Oils & Soap",
  "CPCI": "Kahira Pharmaceuticals & Chemical",
  "CPME": "Catalyst Partners Middle East",
  "CRST": "Creast Mark For Contracting And Real Estate",
  "CSAG": "Canal Shipping Agencies",
  "DAPH": "& Engineering Consultants",
  "DCCC": "Damietta Container and Cargo Handling",
  "DCRC": "Delta Construction & Rebuilding",
  "DEIN": "Delta Insurance",
  "DGTZ": "Digitize for And Technology",
  "DOMT": "الصناعات الغذائية العربية - دومتي",
  "DSCW": "Dice Sports & Casual Wear Manufacturers SAE",
  "DTPP": "Delta for Printing & Packaging",
  "EALR": "El ia for Land Reclamation",
  "EASB": "ian for Securities Brokerage EAC",
  "EAST": "الشرقية - إيسترن كومباني",
  "EBSC": "Osool ESB Securities Brokerage",
  "ECAP": "El Ezz Ceramics & Porcelain (Gemma)",
  "EDFM": "East Delta Flour Mills",
  "EEII": "El ia Engineering",
  "EEP": "Education Platform - EEP",
  "EFAC": "Ferro All Egp10",
  "EFIC": "Financial & Industrial",
  "EFID": "إيديتا للصناعات الغذائية",
  "EFIH": "إي فاينانس للاستثمارات المالية",
  "EGAL": "مصر للألومنيوم",
  "EGAS": "Gas",
  "EGBE": "Gulf Bank",
  "EGCH": "Chemical",
  "EGOTH": "El Masreyah Touris Egp100",
  "EGREF": "s Real Estate Fund",
  "EGS30AJ1C016-EGP": "Dry Ice",
  "EGS370O1C013": "Printing",
  "EGS385S1C012": "Ferchem Misr for Fertilizers & Chemicals",
  "EGS3E071C013-EGP": "Acrow Misr",
  "EGS48271C018-EGP": "- South Africa for Communication",
  "EGS65101C015": "& Reconstruction",
  "EGS65621C012": "El Nasr Housing & Egp5",
  "EGS65861C014": "Contracting -AL- ABD",
  "EGS72L31C011": "SOLARSOL For Energy",
  "EGS73M81C012": "Asset Management And",
  "EGSA": "مصر جنوب أفريقيا للاتصالات",
  "EGTS": "for Tourism Resorts",
  "EGWA": "Warehouses of",
  "EHDR": "s Housing & Reconstruction",
  "EITP": "Tourism Projects",
  "ELAB": "Linear Alkyl Benzene",
  "ELEC": "Electro Cable",
  "ELKA": "El Kahera Housing",
  "ELNA": "El Nasr for Manufacturing Agricultural Crops",
  "ELSH": "El-Shams Housing & SA",
  "ELWA": "Elwadi for &",
  "EMFD": "إعمار مصر للإعادة والتنمية",
  "ENGC": "Industrial Engineering for Construction &",
  "ENPI": "Engineering for the Petroleum and Process",
  "EOSB": "El Orouba Securities Brokerage",
  "EPCO": "for Poultry",
  "EPPK": "El Ahram for Printing & Packing",
  "ETEL": "المصرية للاتصالات",
  "ETRS": "Transport And Commercial Services (Egytrans Nosco)",
  "EXPA": "البنك المصري لتنمية الصادرات",
  "FAIT": "Faisal Islamic Bank of",
  "FAITA": "Faisal Islamic Bank of",
  "FCMD": "Future Care For Medical",
  "FIRE": "First & Real Estate",
  "FNAR": "Al Fanar Contracting Construction Trade Import & Export",
  "FTNS": "Fitness Prime",
  "FWRY": "فوري لتكنولوجيا البنوك والمدفوعات الإلكترونية",
  "GBCO": "جي بي كورب",
  "GDWA": "Gadwa For Industrial",
  "GEOS": "Geos for trading and contracting",
  "GGCC": "Giza Contracting & Real Estate",
  "GGRN": "جو جرين للاستثمار الزراعي",
  "GIHD": "Gharbia Islamic Housing",
  "GMCI": "GMC for Industrial Commercial & Financial s",
  "GOUR": "جورميه إيجيبت",
  "GPIM": "GPI For Urban Growth",
  "GPPL": "Golden Pyramids Plaza",
  "GRCA": "Grand Capital",
  "GSSC": "Silos & Storage",
  "GTEX": "G-TEX for Commercial and Industrial s",
  "GTHE": "Global Telecom .",
  "GTWL": "Golden Textiles & Clothes Wool",
  "HAVC": "Hassan Allam s & Venture Capital",
  "HBCO": "Heibco Npv",
  "HDBK": "بنك التعمير والإسكان",
  "HDST": "HEDGESTONE",
  "HELI": "مصر الجديدة للإسكان والتعمير",
  "HRHO": "مجموعة إي إف جي القابضة",
  "IBCT": "Business Corp. for Trading & Agencies",
  "ICFC": "for Fertilizers & Chemicals",
  "ICID": "for &",
  "ICLE": "for Leasing SAE",
  "IDRE": "Ismailia & Real Estate",
  "IEEC": "Industrial & Engineering Enterprises",
  "IFAP": "Agricultural Products",
  "INEG": "Integrated Engineering",
  "INFI": "الإسماعيلية الوطنية للأغذية",
  "IRAX": "حديد عز",
  "IRON": "Iron & Steel",
  "ISMA": "Ismailia Misr Poultry",
  "ISMQ": "Iron & Steel for Mines & Quarries",
  "ISPH": "إبن سينا فارما",
  "JUFO": "جهينة للصناعات الغذائية",
  "KABO": "El Nasr Clothing & Textiles",
  "KNGC": "EL- Nasr Glass And Crystal",
  "KORA": "KORRA",
  "KRDI": "Al Khair River for Agriculture and Environmental Services",
  "KWIN": "El Kahera El Watania",
  "KZPC": "Kafr El Zayat Pesticides & Chemical",
  "LCSW": "Lecico SAE",
  "LKGP": "The for Financial - The Lakah",
  "LUTS": "Lotus For Agricultural s And",
  "MAAL": "Marseilla Al Masreia Al Khalegeya for",
  "MASR": "مدينة مصر",
  "MBEG": "MB for Engineering & Contracting",
  "MBSC": "Misr Beni Suef Cement SAE",
  "MCQE": "مصر لأسمنت قنا",
  "MCRO": "ماكرو جروب للمستحضرات الطبية - ماكرو كابيتال",
  "MEGM": "Middle East Glass Manufacturing SAE",
  "MENA": "Mena Touristic & Real Estate",
  "MEPA": "Medical Packaging",
  "MFPC": "مصر لإنتاج السماد - موبكو",
  "MFSC": "Misr Duty Free Shops",
  "MHOT": "Misr Hotels",
  "MICH": "Misr Chemical Ltd.",
  "MILS": "North Cairo Mills",
  "MIPH": "Minapharm Pharmaceuticals",
  "MISR": "MISR Intercontinental for Granite & Marble",
  "MITR": "Misr Travel&Touris Egp6",
  "MKIT": "Misr Kuwait & Trading",
  "MLIC": "Misr Life Insurance",
  "MMAT": "Marsa Marsa Alam for Tourism",
  "MMHC": "El Mamoura Co For Egp10",
  "MOED": "Modern Education Systems",
  "MOIL": "Maridive & Oil Services SAE",
  "MOIN": "Mohandes Insurance",
  "MOSC": "Misr Oils & Soap",
  "MPCI": "ممفيس للأدوية والصناعات الكيماوية",
  "MPCO": "Mansourah Poultry",
  "MPRC": "Media Production City",
  "MTIE": "MM for Industry & Trade",
  "NAHO": "Naeem",
  "NARE": "Naeem Real Estate",
  "NBKE": "Bank of Kuwait -",
  "NCCW": "Nasr for Civil Works",
  "NCGC": "Nile Cotton Ginning",
  "NDRL": "Drilling",
  "NEDA": "Northern Upper & Agricultural Production",
  "NFCI": "ELNASR Co For Fertilizers And Chemical",
  "NHPS": "Housing for Professional Syndicates",
  "NINH": "Nozha Hospital",
  "NIPH": "النيل للأدوية والصناعات الكيماوية",
  "NMIN": "El Nasr Mining Co Egp10",
  "OBRI": "El Obour Real Estate",
  "OCAP": "OG Capital For s SPAC",
  "OCDI": "Six of October &",
  "OCPH": "October Pharma",
  "ODIN": "ODIN s",
  "OFH": "O B Financial",
  "OIH": "أوراسكوم للاستثمار القابضة",
  "OLFI": "Obour Land for Food",
  "ORAS": "أوراسكوم كونستراكشون",
  "ORHD": "أوراسكوم للتنمية مصر",
  "ORWE": "النساجون الشرقيون",
  "PACH": "Paints & Chemical",
  "PHAR": "Pharmaceutical",
  "PHDC": "بالم هيلز للتعمير",
  "PHGC": "بريميوم هيلثكير جروب",
  "PHTV": "Pyramisa Hotels",
  "PMSC": "Petroleum Marine Services",
  "POCO": "Port Said Container And Cargo Handling",
  "POUL": "القاهرة للدواجن",
  "PRCL": "for Ceramic & Porcelain Products",
  "PRDC": "Pioneers Properties for Urban",
  "PRMH": "Prime",
  "QNBE": "Qatar Bank",
  "RACC": "Raya Contact Center",
  "RAKT": "Rakta Paper Manufacturing",
  "RAYA": "Raya for Financial s SAE",
  "RKAZ": "REKAZ Financial",
  "RMDA": "العاشر من رمضان - راميدا",
  "RMTV": "Rowad Misr Tourism",
  "ROTO": "Rowad Tourism (Al Rowad) Co",
  "RREI": "Real Estate",
  "RTVC": "Remco for Touristic Villages Construction",
  "RUBX": "Rubex for Plastic & Acrylic Manufacturing",
  "SAIB": "بنك الشركة المصرفية العربية الدولية",
  "SAUD": "Al Baraka Bank",
  "SCEM": "Sinai Cement",
  "SCFM": "South Cairo & Giza Mills & Bakeries",
  "SCTS": "Sues Canal for Technology Settling",
  "SDTI": "Sharm Dreams for Tourism",
  "SEIG": "Saudi & Finance SAE",
  "SEIGA": "Saudi & Finance SAE",
  "SIEG": "for Pipes and Cement Products -Siegwart",
  "SINA": "Sinai Manganese",
  "SIPC": "Sabaa for Pharmaceutial and Chemical Industry",
  "SKPC": "سيدى كرير للبتروكيماويات - سيدبك",
  "SMFR": "Samad Misr-EGYFERT",
  "SMPP": "Modern Shorouk Printing & Packaging",
  "SNFC": "Sharkia Food",
  "SNFI": "Souhag Food",
  "SPHT": "El Shams Pyramids for Hotels & Touristic Projects SAE",
  "SPIN": "Alexandria Spinning & Weaving",
  "SPMD": "Speed Medical SAE",
  "SUCE": "Suez Cement",
  "SUGR": "الدلتا للسكر",
  "SVCE": "South Valley Cement",
  "SWDY": "السويدى إليكتريك",
  "TALM": "Taaleem Management Services",
  "TANM": "Tanmiya for Real Estate",
  "TAQA": "طاقة عربية",
  "TMGH": "مجموعة طلعت مصطفى القابضة",
  "TORA": "Tourah Cement Co",
  "TRTO": "TransOceans Tours",
  "TWSA": "TAWASOA FOR FACTORING",
  "TYCN": "Tycoon For Financial s",
  "UBEE": "United Bank SAE",
  "UEFM": "Upper Flour Mills",
  "UEGC": "El-Saeed Contracting & Real Estate SCCD",
  "UNIP": "Universal for Paper & Packaging Materials-Unipack",
  "UNIT": "United Housing Construction SA",
  "UPMS": "Union Pharmacist For Medical Services And",
  "UTOP": "Utopia Real Estate & Tourism SAE",
  "VALU": "U Consumer Finance",
  "VERT": "Vertika for Industry & Trade",
  "VLMR": "Valmore",
  "VLMRA": "Valmore",
  "WATP": "Modern for Water Proofing",
  "WCDF": "Middle & West Delta Flour Mills",
  "WKOL": "Wadi Kom Ombo Land Reclamation",
  "YAYT": "Spring & Transportation Needs Manufacturing",
  "ZEOT": "Extracted Oils & Derivatives",
  "ZMID": "Zahraa Maadi &"
};

// ─── EARNINGS OVERRIDE LOADING ──────────────────────────────────────────────
function loadEarningsOverrides() {
  try {
    const data = require('../data/earnings_overrides.json');
    if (data && data.overrides) return data.overrides;
  } catch (e) {}

  try {
    const data = require('./data/earnings_overrides.json');
    if (data && data.overrides) return data.overrides;
  } catch (e) {}

  try {
    const locations = [
      path.join(__dirname, '..', 'data', 'earnings_overrides.json'),
      path.join(__dirname, 'data', 'earnings_overrides.json'),
      path.join(process.cwd(), 'data', 'earnings_overrides.json'),
      path.join(process.cwd(), 'frontend', 'data', 'earnings_overrides.json')
    ];
    for (const loc of locations) {
      if (fs.existsSync(loc)) {
        const raw = fs.readFileSync(loc, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.overrides) return parsed.overrides;
      }
    }
  } catch (e) {}

  return {
    'EGAL': {
      netProfit: 10447306397,
      periodMonths: 9,
      totalShares: 412500000,
      dps: 8.00,
      source: 'EGX Bulletin 342202 - Q3 FY2025-2026 (Jul 2025 - Mar 2026)',
      updatedAt: '2026-08-08'
    },
    'POUL': {
      netProfit: 2486690000,
      periodMonths: 12,
      totalShares: 479002000,
      dps: 0.33,
      source: 'Mubasher Breaking News Q1 2026 Consolidated Results (Jan-Mar 2026)',
      updatedAt: '2026-08-08'
    }
  };
}

// ─── AUTOMATED ARABIC HEADLINE PARSER ───────────────────────────────────────
function parseArabicFinancialHeadline(symbol, title, pubDate) {
  if (!title) return null;

  const isEarningsNews = /(أرباح|أرباحها|صافي|أرباحاً|نتائج|ربحية)/.test(title);
  if (!isEarningsNews) return null;

  let periodMonths = 12;

  if (/(9 أشهر|تسعة أشهر|الربع الثالث)/.test(title)) {
    periodMonths = 9;
  } else if (/(النصف الأول|6 أشهر|ستة أشهر|الربع الثاني)/.test(title)) {
    periodMonths = 6;
  } else if (/(الربع الأول|3 أشهر|ثلاثة أشهر)/.test(title)) {
    periodMonths = 3;
  } else if (/(الربع الرابع|سنوية|عام كامل|خلال عام)/.test(title)) {
    periodMonths = 12;
  }

  let netProfit = null;

  const billionMatch = title.match(/(?:إلى|تسجل|بلغت|تحقق|بـ|عند|تصل|سجلت)\s+([0-9]+(?:\.[0-9]+)?)\s*مليار/);
  const millionMatch = title.match(/(?:إلى|تسجل|بلغت|تحقق|بـ|عند|تصل|سجلت)\s+([0-9]+(?:\.[0-9]+)?)\s*مليون/);

  if (billionMatch) {
    netProfit = parseFloat(billionMatch[1]) * 1_000_000_000;
  } else if (millionMatch) {
    netProfit = parseFloat(millionMatch[1]) * 1_000_000;
  }

  if (!netProfit || netProfit <= 0) return null;

  const annualizedNetProfit = netProfit * (12 / periodMonths);

  return {
    symbol: symbol.toUpperCase(),
    netProfit,
    periodMonths,
    annualizedNetProfit,
    headline: title,
    pubDate,
    source: 'Automated EGX News Parser'
  };
}

function fetchAutomatedEarningsFromRss(stockNameAr, symbol) {
  return new Promise((resolve) => {
    const query = `"${stockNameAr}" (أرباح OR أرباحها OR صافي OR "نتائج أعمال")`;
    const encoded = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=ar&gl=EG&ceid=EG:ar`;

    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 4000
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          const items = body.match(/<item>[\s\S]*?<\/item>/g) || [];
          for (const item of items) {
            const titleMatch = item.match(/<title>(.*?)<\/title>/);
            const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
            const title = titleMatch ? titleMatch[1] : '';
            const pubDate = dateMatch ? dateMatch[1] : '';

            const parsed = parseArabicFinancialHeadline(symbol, title, pubDate);
            if (parsed) {
              resolve(parsed);
              return;
            }
          }
          resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

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
        'Recommend.All', 'MACD.macd', 'MACD.signal', 'ADX', 'ATR',
        'dividend_yield_recent', 'dps_common_stock_prim_issue_fy', 'book_value_per_share_fq',
        'net_income_ttm', 'total_shares_outstanding',
        'net_income_fq', 'net_income_fy', 'last_annual_eps', 'earnings_release_date',
        'after_tax_margin'
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
              rsi, sma20, sma50, peRatioRaw, epsRaw,
              recommendScore, macdVal, macdSignalVal, adxVal, atrVal,
              divYieldTv, dpsTv, bvpsTv, netIncomeTtm, totalSharesTv,
              netIncomeFq, netIncomeFy, lastAnnualEps, earningsReleaseDate,
              afterTaxMargin
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
              peRatioRaw,
              epsRaw,
              divYieldTv,
              dpsTv,
              bvps: bvpsTv,
              netIncomeTtm,
              totalShares: totalSharesTv,
              netIncomeFq,
              netIncomeFy,
              lastAnnualEps,
              earningsReleaseDate,
              afterTaxMargin,
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

// ─── SMART EPS ENGINE WITH AUTOMATED LIVE DISCLOSURE PARSER ────────────────
function computeSmartEps(stock, override, autoParsed) {
  const now = Date.now() / 1000;
  const STALE_THRESHOLD = 180 * 24 * 3600; // 6 months in seconds

  // Tier 0: Manual EGX Bulletin Override (highest priority)
  if (override) {
    const annualizedNetProfit = override.netProfit * (12 / override.periodMonths);
    const shares = override.totalShares || stock.totalShares;
    if (shares && shares > 0) {
      const overrideEps = annualizedNetProfit / shares;
      const ttmEps = stock.epsRaw > 0 ? stock.epsRaw :
                     (stock.netIncomeTtm && stock.totalShares > 0 ? stock.netIncomeTtm / stock.totalShares : null);
      let blendedEps = overrideEps;
      if (ttmEps && ttmEps > 0) {
        blendedEps = 0.70 * overrideEps + 0.30 * ttmEps;
      }
      return {
        eps: blendedEps,
        source: 'OVERRIDE',
        confidence: 'HIGH',
        details: `EGX Bulletin: ${override.source} | Annualized NI: ${(annualizedNetProfit / 1e9).toFixed(2)}B | EPS: ${overrideEps.toFixed(2)}`
      };
    }
  }

  // Tier 1: TradingView Audited TTM EPS (verified financial numbers)
  const earningsAge = stock.earningsReleaseDate ? (now - stock.earningsReleaseDate) : 0;
  const isFresh = !stock.earningsReleaseDate || earningsAge < STALE_THRESHOLD;

  if (stock.epsRaw && stock.epsRaw > 0 && isFresh) {
    return {
      eps: stock.epsRaw,
      source: 'TTM_FRESH',
      confidence: 'HIGH',
      details: `TradingView Audited TTM EPS (${stock.epsRaw.toFixed(2)})`
    };
  }

  // Tier 2: Automated Live EGX News Parser (used when TradingView TTM is missing)
  if (autoParsed && autoParsed.annualizedNetProfit > 0) {
    const shares = stock.totalShares;
    if (shares && shares > 0) {
      const autoEps = autoParsed.annualizedNetProfit / shares;
      const ttmEps = stock.epsRaw > 0 ? stock.epsRaw :
                     (stock.netIncomeTtm && stock.totalShares > 0 ? stock.netIncomeTtm / stock.totalShares : null);
      let blendedEps = autoEps;
      if (ttmEps && ttmEps > 0) {
        blendedEps = 0.70 * autoEps + 0.30 * ttmEps;
      }
      return {
        eps: blendedEps,
        source: 'AUTO_NEWS_PARSER',
        confidence: 'HIGH',
        details: `Live News Disclosure (${autoParsed.periodMonths}M): "${autoParsed.headline}" | EPS: ${autoEps.toFixed(2)}`
      };
    }
  }

  // Tier 2: Smart Annualized
  const totalShares = stock.totalShares;
  if (totalShares && totalShares > 0) {
    let annualizedQtrEps = null;
    if (stock.netIncomeFq && stock.netIncomeFq > 0) {
      annualizedQtrEps = (stock.netIncomeFq * 4) / totalShares;
    }

    let growthRate = 0;
    if (stock.netIncomeTtm && stock.netIncomeFy && stock.netIncomeFy > 0) {
      growthRate = (stock.netIncomeTtm - stock.netIncomeFy) / Math.abs(stock.netIncomeFy);
      growthRate = Math.max(-0.50, Math.min(1.0, growthRate));
    }

    let projectedEps = null;
    if (stock.lastAnnualEps && stock.lastAnnualEps > 0) {
      projectedEps = stock.lastAnnualEps * (1 + growthRate);
    }

    let ttmDerivedEps = null;
    if (stock.netIncomeTtm && stock.netIncomeTtm > 0) {
      ttmDerivedEps = stock.netIncomeTtm / totalShares;
    }

    if (ttmDerivedEps && ttmDerivedEps > 0) {
      if (projectedEps && projectedEps > 0 && growthRate !== 0) {
        const blendedEps = 0.60 * ttmDerivedEps + 0.40 * projectedEps;
        return {
          eps: blendedEps,
          source: 'TTM_GROWTH_BLEND',
          confidence: 'HIGH',
          details: `TTM: ${ttmDerivedEps.toFixed(2)} | Growth: ${(growthRate * 100).toFixed(1)}% | Blended: ${blendedEps.toFixed(2)}`
        };
      }
      return {
        eps: ttmDerivedEps,
        source: 'TTM_DERIVED',
        confidence: 'HIGH',
        details: `Derived from net_income_ttm / total_shares`
      };
    }

    if (annualizedQtrEps && annualizedQtrEps > 0) {
      if (stock.lastAnnualEps && stock.lastAnnualEps > 0) {
        const blended = 0.50 * annualizedQtrEps + 0.50 * stock.lastAnnualEps;
        return {
          eps: blended,
          source: 'QTR_ANNUAL_BLEND',
          confidence: 'MEDIUM',
          details: `Qtr annualized: ${annualizedQtrEps.toFixed(2)} | Last annual: ${stock.lastAnnualEps.toFixed(2)}`
        };
      }
      return {
        eps: annualizedQtrEps,
        source: 'QTR_ANNUALIZED',
        confidence: 'MEDIUM',
        details: `net_income_fq × 4 / total_shares`
      };
    }

    if (stock.lastAnnualEps && stock.lastAnnualEps > 0) {
      return {
        eps: stock.lastAnnualEps,
        source: 'LAST_ANNUAL',
        confidence: 'MEDIUM',
        details: `Last completed fiscal year EPS`
      };
    }
  }

  // Tier 3: Stale fallback
  if (stock.epsRaw && stock.epsRaw > 0) {
    return {
      eps: stock.epsRaw,
      source: 'TTM_STALE',
      confidence: 'MEDIUM',
      details: `TradingView TTM EPS (stale, ${Math.round(earningsAge / 86400)}d old)`
    };
  }

  if (stock.dpsTv && stock.dpsTv > 0) {
    const dpsEps = stock.dpsTv / 0.60;
    return {
      eps: dpsEps,
      source: 'DPS_DERIVED',
      confidence: 'LOW',
      details: `Estimated from DPS (${stock.dpsTv}) / 0.60 payout ratio`
    };
  }

  return { eps: null, source: 'NONE', confidence: 'LOW', details: 'No EPS data available' };
}

function resolveFundamentals(stock, override, autoParsed) {
  const smartEps = computeSmartEps(stock, override, autoParsed);
  const eps = smartEps.eps;
  const peRatio = stock.peRatioRaw ? Number(stock.peRatioRaw.toFixed(2)) :
    (eps && eps > 0 ? Number((stock.currentPrice / eps).toFixed(2)) : undefined);
  const dps = (override && override.dps) ? override.dps :
    stock.dpsTv || (stock.divYieldTv && stock.currentPrice > 0 ? (stock.currentPrice * stock.divYieldTv) / 100 : undefined);
  const dividendYield = (stock.divYieldTv && stock.divYieldTv > 0) ? Number(stock.divYieldTv.toFixed(2)) :
    (dps && stock.currentPrice > 0 ? Number(((dps / stock.currentPrice) * 100).toFixed(2)) : undefined);
  const dividendPerShare = dps ? Number(Number(dps).toFixed(2)) : undefined;

  return { eps, peRatio, dividendYield, dividendPerShare, epsSource: smartEps.source, epsConfidence: smartEps.confidence, epsDetails: smartEps.details };
}

function calculateFairValue(stock, fundamentals) {
  const price = stock.currentPrice;
  const low52 = stock.fiftyTwoWeekLow || price * 0.7;
  const high52 = stock.fiftyTwoWeekHigh || price * 1.3;
  const macroDiscount = 0.878;
  const clampedScore = Math.max(-1, Math.min(1, stock.recommendScore || 0));
  const momentumMultiplier = 1 + (clampedScore * 0.05);

  let fvPe = null;
  let fvPb = null;

  // Model A: Earnings Multiple (P/E)
  if (fundamentals.eps && fundamentals.eps > 0) {
    const sectorPE = 12.0;
    fvPe = fundamentals.eps * sectorPE * momentumMultiplier * macroDiscount;
  }

  // Model B: Book Value Multiple (P/B)
  if (stock.bvps && stock.bvps > 0) {
    const sectorPB = 2.5;
    fvPb = stock.bvps * sectorPB * momentumMultiplier * macroDiscount;
  }

  let fairValueRaw = null;
  let conf = 'MEDIUM';

  if (fvPe && fvPb) {
    // Sector-Adaptive Multi-Model Weighting:
    // When earnings power significantly exceeds accounting book value (e.g. industrial/growth),
    // weight 75% Earnings (P/E) + 25% Book Value (P/B) to prevent historical asset depreciation drag.
    if (fvPe > fvPb * 1.3) {
      fairValueRaw = 0.75 * fvPe + 0.25 * fvPb;
    } else {
      fairValueRaw = 0.50 * fvPe + 0.50 * fvPb;
    }
    conf = 'HIGH';
  } else if (fvPe) {
    fairValueRaw = fvPe;
    conf = fundamentals.epsConfidence === 'HIGH' ? 'HIGH' : 'MEDIUM';
  } else if (fvPb) {
    fairValueRaw = fvPb;
    conf = 'MEDIUM';
  } else if (fundamentals.dividendPerShare && fundamentals.dividendPerShare > 0) {
    const requiredReturn = 0.12;
    fairValueRaw = (fundamentals.dividendPerShare / requiredReturn) * momentumMultiplier * macroDiscount;
    conf = 'MEDIUM';
  }

  if (fairValueRaw && fairValueRaw > 0) {
    const clamped = Math.max(price * 0.80, Math.min(price * 1.50, fairValueRaw));
    return { fairValue: Number(clamped.toFixed(2)), confidence: conf };
  }

  const rangeMidpoint = low52 + 0.618 * (high52 - low52);
  const volRatio = stock.avgVolume > 0 ? Math.min(stock.volume / stock.avgVolume, 2.0) : 1;
  const scoreFactor = 1 + (clampedScore * 0.1);
  const estVal = rangeMidpoint * (0.9 + 0.1 * volRatio) * scoreFactor * macroDiscount;
  const clampedFallback = Math.max(price * 0.80, Math.min(price * 1.50, estVal));
  return { fairValue: Number(clampedFallback.toFixed(2)), confidence: 'LOW' };
}

function calculateIntradaySignal(stock) {
  const reasons = [];
  const price = stock.currentPrice;
  let score = 0;

  if (stock.volume > 0 && stock.avgVolume > 0) {
    const volRatio = stock.volume / stock.avgVolume;
    if (volRatio >= 2.0) { score += 3; reasons.push(`⚡ حجم تداول استثنائي (${volRatio.toFixed(1)}x المتوسط) - نشاط مؤسسي قوي`); }
    else if (volRatio >= 1.5) { score += 2; reasons.push(`📈 ارتفاع حجم التداول (${volRatio.toFixed(1)}x المتوسط) - زخم متزايد`); }
    else if (volRatio >= 1.2) { score += 1; reasons.push(`📊 حجم تداول فوق المتوسط (${volRatio.toFixed(1)}x)`); }
  }

  if (stock.rsi < 30) { score += 2; reasons.push(`🚀 RSI (${stock.rsi}) تشبع بيعي حاد - فرصة ارتداد سريع`); }
  else if (stock.rsi < 40) { score += 1; reasons.push(`📈 RSI (${stock.rsi}) في منطقة الارتداد الإيجابي`); }
  else if (stock.rsi > 80) { score -= 2; reasons.push(`🚨 RSI (${stock.rsi}) تشبع شرائي حاد - خطر جني أرباح`); }
  else if (stock.rsi > 70) { score -= 1; reasons.push(`⚠️ RSI (${stock.rsi}) تشبع شرائي - احترس من التصحيح`); }

  if (stock.dayHigh > stock.dayLow) {
    const dayRange = stock.dayHigh - stock.dayLow;
    const positionFromLow = (price - stock.dayLow) / dayRange;
    if (positionFromLow <= 0.25) { score += 1; reasons.push(`📥 السعر قرب أدنى مستوى اليوم - نقطة دخول منخفضة`); }
    else if (positionFromLow >= 0.75) { score -= 1; reasons.push(`📤 السعر قرب أعلى مستوى اليوم - مخاطرة شراء مرتفعة`); }
  }

  if (stock.changePercent >= 3) { score += 1; reasons.push(`🔥 صعود قوي اليوم (+${stock.changePercent}%) - زخم صاعد`); }
  else if (stock.changePercent <= -3) { score -= 1; reasons.push(`📉 هبوط قوي اليوم (${stock.changePercent}%) - ضغط بيعي`); }

  if (stock.macdVal > stock.macdSignalVal) { score += 1; reasons.push(`🟢 MACD تقاطع إيجابي (صاعد)`); }
  else { score -= 1; reasons.push(`🔴 MACD تقاطع سلبي (هابط)`); }

  if (price > stock.sma20) { score += 1; reasons.push(`🐂 السعر فوق SMA20 - اتجاه صاعد داخل الجلسة`); }
  else { score -= 1; reasons.push(`🐻 السعر تحت SMA20 - اتجاه هابط داخل الجلسة`); }

  let intradaySignal = 'NEUTRAL';
  if (score >= 5) intradaySignal = 'STRONG_BUY';
  else if (score >= 2) intradaySignal = 'BUY';
  else if (score <= -5) intradaySignal = 'STRONG_SELL';
  else if (score <= -2) intradaySignal = 'SELL';

  const atrVal = stock.atrVal || price * 0.02;
  const isBuy = score >= 0;
  const intradayEntry = Number(price.toFixed(2));
  const intradayTarget = Number((price + (isBuy ? 1 : -1) * Math.max(atrVal * 1.5, price * 0.02)).toFixed(2));
  const intradayStopLoss = Number((price + (isBuy ? -1 : 1) * Math.max(atrVal, price * 0.015)).toFixed(2));

  return { intradaySignal, intradayScore: score, intradayReasons: reasons, intradayEntry, intradayTarget, intradayStopLoss };
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
    signalType, signalScore: totalScore, reasons,
    suggestedEntry: { min: entryMin, max: entryMax },
    suggestedTarget1: Number(Math.max(price * 1.05, Math.min(fairValue, price * 1.15)).toFixed(2)),
    suggestedTarget2: fairValue,
    suggestedStopLoss: Number((price * 0.95).toFixed(2)),
    positionSizePercent: signalType === 'BUY' ? 12 : 5,
    riskRewardRatio: Number((((fairValue - price) / (price * 0.05)) || 1.5).toFixed(2))
  };
}

let LOCAL_STOCKS_CACHE = null;
let LOCAL_STOCKS_CACHE_TIME = 0;
const CACHE_TTL_MS = 60 * 1000;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();
  if (LOCAL_STOCKS_CACHE && (now - LOCAL_STOCKS_CACHE_TIME < CACHE_TTL_MS)) {
    res.setHeader('X-Served-By', 'Azure-VM-PrimaryCache');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(LOCAL_STOCKS_CACHE);
  }

  // Try proxying to Azure Primary VM first (Server-to-Server, bypassing HTTPS Mixed Content)
  try {
    const source = (req.query && req.query.source) || 'tradingview';
    const halal = (req.query && (req.query.halal || req.query.sharia)) ? `&halal=${req.query.halal || req.query.sharia}` : '';
    const azureData = await fetchFromAzureVM(`/api/stocks?source=${source}${halal}`);
    if (azureData && Array.isArray(azureData) && azureData.length > 0) {
      res.setHeader('X-Served-By', 'Azure-VM-Primary');
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
      return res.status(200).json(azureData);
    }
  } catch (azureErr) {
    console.warn('Azure VM proxy failed, falling back to Vercel compute:', azureErr.message);
  }

  try {
    const halalOnly = req.query && (req.query.halal === 'true' || req.query.sharia === 'true' || req.query.halal === '1');
    const earningsOverrides = loadEarningsOverrides();
    const [stocks, halalSet] = await Promise.all([
      fetchTradingViewScan(),
      fetchHalalSymbolsSet()
    ]);

    const processed = [];

    for (const s of stocks) {
      const symUpper = s.symbol.toUpperCase();
      const rawUpper = (s.rawSym || '').toUpperCase();

      const isNonHalal = CONVENTIONAL_NON_HALAL.has(symUpper) || CONVENTIONAL_NON_HALAL.has(rawUpper);
      const isHalal = !isNonHalal && (!halalSet || halalSet.size === 0 || halalSet.has(symUpper) || halalSet.has(rawUpper));

      if (halalOnly && !isHalal) continue;

      // 1. Manual override
      const override = earningsOverrides[symUpper] || earningsOverrides[rawUpper] || null;

      // 2. Automated news earnings scraper fallback for all stocks
      let autoParsed = null;
      let nameAr = STOCK_ARABIC_NAMES[symUpper] || STOCK_ARABIC_NAMES[rawUpper];
      if (!nameAr && s.name) {
        // Strip English ticker parens e.g. "القاهرة للدواجن (POUL)" -> "القاهرة للدواجن"
        const cleanName = s.name.replace(/\s*\([A-Z0-9-]+\)\s*/g, '').trim();
        if (/[\u0600-\u06FF]/.test(cleanName)) {
          nameAr = cleanName;
        }
      }

      if (!override && nameAr) {
        autoParsed = await fetchAutomatedEarningsFromRss(nameAr, symUpper);
      }

      const fundamentals = resolveFundamentals(s, override, autoParsed);

      const { fairValue, confidence } = calculateFairValue(s, fundamentals);
      const upsidePercent = Number((((fairValue - s.currentPrice) / s.currentPrice) * 100).toFixed(2));
      const signalData = calculateSignal(s, fairValue, upsidePercent);
      const intradayData = calculateIntradaySignal(s);

      let stAction = 'احتفاظ (Hold)'; let stBadge = 'ترقب';
      let stReason = 'السهم يتداول في مسار عرضي، يُنصح بالاحتفاظ مع الالتزام بوقف الخسارة.';
      if (s.sma20 > s.sma50 && s.macdVal !== undefined && s.macdSignalVal !== undefined && s.macdVal > s.macdSignalVal) {
        stAction = 'تجميع فني (Buy/Accumulate)'; stBadge = 'إيجابي';
        stReason = 'اتجاه صاعد على المدى القصير مع زخم إيجابي للماكد. ينصح بالتجميع بالقرب من مناطق الدعم.';
      } else if (s.sma20 < s.sma50 && s.rsi < 40) {
        stAction = 'ترقب ارتداد (Watch)'; stBadge = 'مراقبة';
        stReason = 'السهم في مسار هابط ولكن يقترب من مناطق تشبع بيعي. ننتظر إشارة انعكاس.';
      } else if (s.rsi > 70) {
        stAction = 'جني أرباح جزئي (Take Profit)'; stBadge = 'مخاطرة';
        stReason = 'السهم في مناطق تشبع شرائي قوية، يُنصح بتخفيف المراكز وجني الأرباح.';
      }
      const shortTermRec = { action: stAction, badge: stBadge, reason: stReason, targetPrice: signalData.suggestedTarget1, stopLoss: signalData.suggestedStopLoss };

      let ltAction = 'احتفاظ استثماري (Hold)'; let ltBadge = 'عادل';
      let ltReason = 'السهم يتداول بالقرب من قيمته العادلة الأساسية.';
      if (upsidePercent >= 20) {
        ltAction = 'استثمار طويل الأجل (Strong Buy)'; ltBadge = 'فرصة قيمة';
        ltReason = 'السهم يتداول بخصم كبير عن قيمته العادلة، يمثل فرصة استثمارية ممتازة بناءً على الأساسيات.';
      } else if (upsidePercent >= 5) {
        ltAction = 'تجميع استثماري (Accumulate)'; ltBadge = 'أقل من القيمة';
        ltReason = 'السهم يتداول دون قيمته العادلة، يُنصح ببناء مراكز استثمارية تدريجياً.';
      } else if (upsidePercent <= -15) {
        ltAction = 'تخفيف مراكز (Reduce)'; ltBadge = 'مبالغة سعرية';
        ltReason = 'السهم يتداول بعلاوة سعرية عالية فوق قيمته العادلة، يُنصح بجني الأرباح لتجنب التصحيح.';
      }
      const longTermRec = { action: ltAction, badge: ltBadge, reason: ltReason, targetPrice: fairValue };

      processed.push({
        symbol: s.symbol, name: s.name, currentPrice: s.currentPrice,
        changePercent: s.changePercent, volume: s.volume, avgVolume: s.avgVolume,
        dayHigh: s.dayHigh, dayLow: s.dayLow,
        fiftyTwoWeekHigh: s.fiftyTwoWeekHigh, fiftyTwoWeekLow: s.fiftyTwoWeekLow,
        rsi: s.rsi, sma20: s.sma20, sma50: s.sma50,
        peRatio: fundamentals.peRatio, eps: fundamentals.eps,
        epsSource: fundamentals.epsSource, epsDetails: fundamentals.epsDetails,
        macdVal: s.macdVal, macdSignalVal: s.macdSignalVal,
        adxVal: s.adxVal, atrVal: s.atrVal,
        fairValue, fairValueConfidence: confidence, fairValueUpsidePercent: upsidePercent,
        isHalal: isHalal,
        ...signalData, ...intradayData,
        quote: {
          symbol: s.symbol, nameEn: s.name, nameAr: s.name,
          currentPrice: s.currentPrice,
          previousClose: Number((s.currentPrice / (1 + s.changePercent / 100)).toFixed(2)),
          change: Number((s.currentPrice * (s.changePercent / 100)).toFixed(2)),
          changePercent: s.changePercent,
          dayHigh: s.dayHigh, dayLow: s.dayLow,
          fiftyTwoWeekHigh: s.fiftyTwoWeekHigh, fiftyTwoWeekLow: s.fiftyTwoWeekLow,
          volume: s.volume, avgVolume: s.avgVolume,
          peRatio: fundamentals.peRatio,
          dividendYield: fundamentals.dividendYield,
          dividendPerShare: fundamentals.dividendPerShare
        },
        indicators: {
          rsi: s.rsi, sma20: s.sma20, sma50: s.sma50,
          support: Number((s.currentPrice * 0.96).toFixed(2)),
          resistance: Number((s.currentPrice * 1.05).toFixed(2)),
          volumeSpike: s.volume > s.avgVolume * 1.5,
          volumeRatio: s.avgVolume > 0 ? Number((s.volume / s.avgVolume).toFixed(2)) : 1
        },
        suggestedTarget: { target1: signalData.suggestedTarget1, target2: signalData.suggestedTarget2 },
        shariaTier: isHalal ? 'COMPLIANT' : 'NON_COMPLIANT',
        shariaStatusText: isHalal ? '🟢 متوافق مع أحكام الشريعة الإسلامية' : '🔴 غير متوافق (أسهم تقليدية/بنوك)',
        shortTermRec, longTermRec
      });
    }

    if (processed && processed.length > 0) {
      LOCAL_STOCKS_CACHE = processed;
      LOCAL_STOCKS_CACHE_TIME = Date.now();
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(processed);
  } catch (err) {
    console.error('Error fetching EGX stocks:', err);
    return res.status(500).json({ error: 'Failed to fetch EGX stocks' });
  }
};