export interface StockMeta {
  symbol: string;
  yahooSymbol: string;
  nameEn: string;
  nameAr: string;
  sector: string;
  defaultSupport?: number;
  defaultResistance?: number;
}

export const INITIAL_STOCKS: StockMeta[] = [
  { symbol: 'AMOC', yahooSymbol: 'AMOC.CA', nameEn: 'Alexandria Mineral Oils Company', nameAr: 'الإسكندرية للزيوت المعدنية', sector: 'Oil & Gas' },
  { symbol: 'MPCI', yahooSymbol: 'MPCI.CA', nameEn: 'Memphis Pharmaceutical', nameAr: 'ممفيس للأدوية والصناعات الكيماوية', sector: 'Pharmaceuticals' },
  { symbol: 'ORAS', yahooSymbol: 'ORAS.CA', nameEn: 'Orascom Construction PLC', nameAr: 'أوراسكوم كونستراكشون', sector: 'Construction' },
  { symbol: 'ORWE', yahooSymbol: 'ORWE.CA', nameEn: 'Oriental Weavers', nameAr: 'النساجون الشرقيون', sector: 'Textiles & Consumer Goods' },
  { symbol: 'SWDY', yahooSymbol: 'SWDY.CA', nameEn: 'Elsewedy Electric', nameAr: 'السويدى إليكتريك', sector: 'Industrial Cables & Energy' },
  { symbol: 'EGAL', yahooSymbol: 'EGAL.CA', nameEn: 'Egypt Aluminium', nameAr: 'مصر للألومنيوم', sector: 'Metals & Mining' },
  { symbol: 'SKPC', yahooSymbol: 'SKPC.CA', nameEn: 'Sidi Kerir Petrochemicals', nameAr: 'سيدى كرير للبتروكيماويات', sector: 'Petrochemicals' },
  { symbol: 'ETEL', yahooSymbol: 'ETEL.CA', nameEn: 'Telecom Egypt', nameAr: 'المصرية للاتصالات', sector: 'Telecommunications' },
  { symbol: 'JUFO', yahooSymbol: 'JUFO.CA', nameEn: 'Juhayna Food Industries', nameAr: 'جهينة للصناعات الغذائية', sector: 'Food & Beverage' },
  { symbol: 'ISPH', yahooSymbol: 'ISPH.CA', nameEn: 'Ibn Sina Pharma', nameAr: 'ابن سينا فارما', sector: 'Pharmaceuticals' },
  { symbol: 'EFID', yahooSymbol: 'EFID.CA', nameEn: 'Edita Food Industries', nameAr: 'ايديتا للصناعات الغذائية', sector: 'Food & Beverage' },
  { symbol: 'RMDA', yahooSymbol: 'RMDA.CA', nameEn: 'Rameda Pharmaceuticals', nameAr: 'العاشر من رمضان - راميدا', sector: 'Pharmaceuticals' }
];
