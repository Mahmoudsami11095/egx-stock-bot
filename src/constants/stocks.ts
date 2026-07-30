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
  { symbol: 'ABUK', yahooSymbol: 'ABUK.CA', nameEn: 'Abu Qir Fertilizers', nameAr: 'أبو قير للأساد', sector: 'Fertilizers & Chemicals' },
  { symbol: 'AMOC', yahooSymbol: 'AMOC.CA', nameEn: 'Alexandria Mineral Oils Company', nameAr: 'الإسكندرية للزيوت المعدنية', sector: 'Oil & Gas' },
  { symbol: 'MASR', yahooSymbol: 'MASR.CA', nameEn: 'Madinet Masr for Housing', nameAr: 'مدينة مصر للإسكان والتعمير', sector: 'Real Estate' },
  { symbol: 'MICH', yahooSymbol: 'MICH.CA', nameEn: 'Misr Chemical Industries', nameAr: 'مصر للصناعات الكيماوية', sector: 'Chemicals' },
  { symbol: 'MPCI', yahooSymbol: 'MPCI.CA', nameEn: 'Memphis Pharmaceutical', nameAr: 'ممفيس للأدوية والصناعات الكيماوية', sector: 'Pharmaceuticals' },
  { symbol: 'OLFI', yahooSymbol: 'OLFI.CA', nameEn: 'Obour Land for Food Industries', nameAr: 'عبور لاند للصناعات الغذائية', sector: 'Food & Beverage' },
  { symbol: 'ORAS', yahooSymbol: 'ORAS.CA', nameEn: 'Orascom Construction PLC', nameAr: 'أوراسكوم كونستراكشون', sector: 'Construction' },
  { symbol: 'ORWE', yahooSymbol: 'ORWE.CA', nameEn: 'Oriental Weavers', nameAr: 'النساجون الشرقيون', sector: 'Textiles & Consumer Goods' },
  { symbol: 'SWDY', yahooSymbol: 'SWDY.CA', nameEn: 'Elsewedy Electric', nameAr: 'السويدى إليكتريك', sector: 'Industrial Cables & Energy' },
  { symbol: 'EGAL', yahooSymbol: 'EGAL.CA', nameEn: 'Egypt Aluminium', nameAr: 'مصر للألومنيوم', sector: 'Metals & Mining' },
  { symbol: 'SUGR', yahooSymbol: 'SUGR.CA', nameEn: 'Delta Sugar', nameAr: 'الدلتا للسكر', sector: 'Food & Agriculture' },
  { symbol: 'SKPC', yahooSymbol: 'SKPC.CA', nameEn: 'Sidi Kerir Petrochemicals', nameAr: 'سيدى كرير للبتروكيماويات', sector: 'Petrochemicals' },
  { symbol: 'ETEL', yahooSymbol: 'ETEL.CA', nameEn: 'Telecom Egypt', nameAr: 'المصرية للاتصالات', sector: 'Telecommunications' },
  { symbol: 'JUFO', yahooSymbol: 'JUFO.CA', nameEn: 'Juhayna Food Industries', nameAr: 'جهينة للصناعات الغذائية', sector: 'Food & Beverage' },
  { symbol: 'ISPH', yahooSymbol: 'ISPH.CA', nameEn: 'Ibn Sina Pharma', nameAr: 'ابن سينا فارما', sector: 'Pharmaceuticals' },
  { symbol: 'EFID', yahooSymbol: 'EFID.CA', nameEn: 'Edita Food Industries', nameAr: 'ايديتا للصناعات الغذائية', sector: 'Food & Beverage' },
  { symbol: 'ALCN', yahooSymbol: 'ALCN.CA', nameEn: 'Alexandria Container & Cargo', nameAr: 'الإسكندرية لتداول الحاويات', sector: 'Logistics & Shipping' },
  { symbol: 'MFPC', yahooSymbol: 'MFPC.CA', nameEn: 'Misr Fertilizers Production (MOPCO)', nameAr: 'مصر للإنتاج السمادي - موبكو', sector: 'Fertilizers' },
  { symbol: 'HELI', yahooSymbol: 'HELI.CA', nameEn: 'Heliopolis Housing', nameAr: 'مصر الجديدة للإسكان والتعمير', sector: 'Real Estate' },
  { symbol: 'EMFD', yahooSymbol: 'EMFD.CA', nameEn: 'Emaar Misr for Development', nameAr: 'إعمار مصر للتنمية', sector: 'Real Estate' },
  { symbol: 'RMDA', yahooSymbol: 'RMDA.CA', nameEn: 'Rameda Pharmaceuticals', nameAr: 'العاشر من رمضان - راميدا', sector: 'Pharmaceuticals' },
  { symbol: 'FAIT', yahooSymbol: 'FAIT.CA', nameEn: 'Faisal Islamic Bank of Egypt', nameAr: 'بنك فيصل الإسلامي المصري', sector: 'Islamic Banking' },
  { symbol: 'ADIB', yahooSymbol: 'ADIB.CA', nameEn: 'Abu Dhabi Islamic Bank Egypt', nameAr: 'مصرف أبوظبي الإسلامي - مصر', sector: 'Islamic Banking' },
];
