export interface StockMeta {
  symbol: string;
  yahooSymbol: string;
  nameEn: string;
  nameAr: string;
  sector: string;
  defaultSupport?: number;
  defaultResistance?: number;
  fxSensitivity?: number;
}

// Current CBE (Central Bank of Egypt) Corridor Interest Rate (~27.25%)
// Configurable via environment variable to avoid redeployment on rate changes
export const CBE_CORRIDOR_INTEREST_RATE = Number(process.env.CBE_RATE || 0.2725);

// Baseline USD/EGP rate prior to major floatations/adjustments
export const BASE_USD_EGP_RATE = 48.0;

export const SECTOR_FX_SENSITIVITY: Record<string, number> = {
  'Pharmaceuticals': -0.10, // import-dependent APIs
  'Food & Beverage': -0.05,  // import-dependent commodities
  'Telecommunications': 0.05, // dollar-linked infrastructure but local pricing power
  'Construction': -0.05,      // steel/cement import costs
  'Textiles & Consumer Goods': 0.10, // export-heavy (e.g. Oriental Weavers exports globally)
  'Industrial Cables & Energy': 0.20, // heavy exporter (Elsewedy SWDY)
  'Oil & Gas': 0.25,          // heavily dollarized parity (AMOC)
  'Petrochemicals': 0.20,     // dollar-denominated prices (SKPC)
  'Metals & Mining': 0.15,    // global metal pricing (EGAL)
  'Banking': -0.05,           // localized assets
  'General': 0.0
};

export function getStockFxSensitivity(sector?: string): number {
  if (!sector) return 0.0;
  for (const [key, val] of Object.entries(SECTOR_FX_SENSITIVITY)) {
    if (sector.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(sector.toLowerCase())) {
      return val;
    }
  }
  return 0.0;
}

/**
 * Calculates macro equity discount factor based on interest rate environment.
 * Base baseline: 12% interest rate -> factor 1.0.
 * Above 12%: discounts valuation multiples by ~1.2% per interest percentage point.
 */
export function getCbeMacroDiscountFactor(cbeRate: number = CBE_CORRIDOR_INTEREST_RATE): number {
  const excessInterest = Math.max(0, cbeRate - 0.12);
  const discountFactor = Math.max(0.75, 1 - (excessInterest * 0.80)); // ~0.878 at 27.25%
  return Number(discountFactor.toFixed(3));
}

export const SECTOR_PE_MULTIPLIERS: Record<string, number> = {
  'Pharmaceuticals': 18.0,
  'Food & Beverage': 16.0,
  'Telecommunications': 14.0,
  'Construction': 12.0,
  'Textiles & Consumer Goods': 13.0,
  'Industrial Cables & Energy': 12.0,
  'Oil & Gas': 10.0,
  'Petrochemicals': 10.0,
  'Metals & Mining': 9.0,
  'Banking': 8.0,
  'Halal EGX': 13.5, // Standard baseline fallback
  'General': 13.5
};

export function getSectorPE(sector?: string): number {
  if (!sector) return 13.5;
  for (const [key, val] of Object.entries(SECTOR_PE_MULTIPLIERS)) {
    if (sector.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(sector.toLowerCase())) {
      return val;
    }
  }
  return 13.5;
}

export const INITIAL_STOCKS: StockMeta[] = [
  { symbol: 'AMOC', yahooSymbol: 'AMOC.CA', nameEn: 'Alexandria Mineral Oils Company', nameAr: 'الإسكندرية للزيوت المعدنية', sector: 'Oil & Gas' },
  { symbol: 'MPCI', yahooSymbol: 'MPCI.CA', nameEn: 'Memphis Pharmaceutical', nameAr: 'ممفيس للأدوية والصناعات الكيماوية', sector: 'Pharmaceuticals' },
  { symbol: 'ORAS', yahooSymbol: 'ORAS.CA', nameEn: 'Orascom Construction PLC', nameAr: 'أوراسكوم كونستراكشون', sector: 'Construction' },
  { symbol: 'ADIB', yahooSymbol: 'ADIB.CA', nameEn: 'Abu Dhabi Islamic Bank', nameAr: 'مصرف أبوظبي الإسلامي - مصر', sector: 'Banking' },
  { symbol: 'SWDY', yahooSymbol: 'SWDY.CA', nameEn: 'Elsewedy Electric', nameAr: 'السويدى إليكتريك', sector: 'Industrial Cables & Energy' },
  { symbol: 'ABUK', yahooSymbol: 'ABUK.CA', nameEn: 'Abu Qir Fertilizers', nameAr: 'أبوقير للأسمدة والصناعات الكيماوية', sector: 'Petrochemicals' },
  { symbol: 'TMGH', yahooSymbol: 'TMGH.CA', nameEn: 'Talaat Moustafa Group', nameAr: 'مجموعة طلعت مصطفى القابضة', sector: 'Construction' },
  { symbol: 'ETEL', yahooSymbol: 'ETEL.CA', nameEn: 'Telecom Egypt', nameAr: 'المصرية للاتصالات', sector: 'Telecommunications' },
  { symbol: 'JUFO', yahooSymbol: 'JUFO.CA', nameEn: 'Juhayna Food Industries', nameAr: 'جهينة للصناعات الغذائية', sector: 'Food & Beverage' },
  { symbol: 'HELI', yahooSymbol: 'HELI.CA', nameEn: 'Heliopolis Housing', nameAr: 'مصر الجديدة للإسكان والتعمير', sector: 'Construction' },
  { symbol: 'ISPH', yahooSymbol: 'ISPH.CA', nameEn: 'Ibn Sina Pharma', nameAr: 'ابن سينا فارما', sector: 'Pharmaceuticals' },
  { symbol: 'AMER', yahooSymbol: 'AMER.CA', nameEn: 'Amer Group Holding', nameAr: 'مجموعة عامر القابضة', sector: 'Construction' },
  { symbol: 'ORWE', yahooSymbol: 'ORWE.CA', nameEn: 'Oriental Weavers', nameAr: 'النساجون الشرقيون', sector: 'Textiles & Consumer Goods' },
  { symbol: 'EGAL', yahooSymbol: 'EGAL.CA', nameEn: 'Egypt Aluminium', nameAr: 'مصر للألومنيوم', sector: 'Metals & Mining' },
  { symbol: 'SKPC', yahooSymbol: 'SKPC.CA', nameEn: 'Sidi Kerir Petrochemicals', nameAr: 'سيدى كرير للبتروكيماويات', sector: 'Petrochemicals' },
  { symbol: 'EFID', yahooSymbol: 'EFID.CA', nameEn: 'Edita Food Industries', nameAr: 'ايديتا للصناعات الغذائية', sector: 'Food & Beverage' },
  { symbol: 'RMDA', yahooSymbol: 'RMDA.CA', nameEn: 'Rameda Pharmaceuticals', nameAr: 'العاشر من رمضان - راميدا', sector: 'Pharmaceuticals' },
  { symbol: 'ARCC', yahooSymbol: 'ARCC.CA', nameEn: 'Arabian Cement Company', nameAr: 'العربية للأسمنت', sector: 'Construction' }
];

export interface StockFundamentalFallback {
  eps?: number;
  peRatio?: number;
  dividendYield?: number;
  dividendPerShare?: number;
}

export const KNOWN_FUNDAMENTAL_FALLBACKS: Record<string, StockFundamentalFallback> = {
  'ARCC': {
    eps: 9.55,
    peRatio: 6.18,
    dividendYield: 9.05,
    dividendPerShare: 5.34
  }
};

