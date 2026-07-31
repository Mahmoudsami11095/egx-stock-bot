export interface StockMeta {
  symbol: string;
  yahooSymbol: string;
  nameEn: string;
  nameAr: string;
  sector: string;
  defaultSupport?: number;
  defaultResistance?: number;
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
  { symbol: 'RMDA', yahooSymbol: 'RMDA.CA', nameEn: 'Rameda Pharmaceuticals', nameAr: 'العاشر من رمضان - راميدا', sector: 'Pharmaceuticals' }
];
