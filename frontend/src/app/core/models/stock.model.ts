export type SignalType = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
export type ShariaTier = 'COMPLIANT' | 'MARGINAL' | 'NON_COMPLIANT' | 'UNDER_REVIEW';
export type DataSource = 'tradingview' | 'investing' | 'yahoo' | 'eodhd' | 'mubasher' | 'egx_beta';

export interface StockQuote {
  symbol: string;
  nameEn: string;
  nameAr: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  volume: number;
  avgVolume: number;
  peRatio?: number;
  sector?: string;
  dividendYield?: number;
  dividendPerShare?: number;
}

export interface TechnicalIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  macd?: { macd?: number; signal?: number; histogram?: number };
  adx?: number;
  atr?: number;
  support: number;
  resistance: number;
  volumeSpike: boolean;
  volumeRatio: number;
}

export interface StockAnalysisResult {
  quote: StockQuote;
  indicators: TechnicalIndicators;
  signalType: SignalType;
  signalScore: number;
  reasons: string[];
  fairValue: number;
  fairValueConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  fairValueUpsidePercent: number;
  marketRegime: 'BULLISH' | 'BEARISH' | 'UNKNOWN';
  isHalal?: boolean;
  shariaTier: ShariaTier;
  shariaStatusText: string;
  purificationPercent?: number;
  shariaInfo?: {
    isHalal: boolean;
    tier: string;
    statusText: string;
    haramRevenuePercent: number;
    debtRatioPercent: number;
    purificationPercent?: number;
    reason?: string;
  };
  fxSensitivity?: number;
  devaluationAdjustment?: number;
  liquidityCapWarning?: string;
  suggestedEntry: { min: number; max: number };
  suggestedTarget: { target1: number; target2: number };
  suggestedStopLoss: number;
  positionSizePercent: number;
  riskRewardRatio: number;
  // Intraday (scalping/session) trading fields
  intradaySignal?: SignalType;
  intradayScore?: number;
  intradayReasons?: string[];
  intradayEntry?: number;
  intradayTarget?: number;
  intradayStopLoss?: number;
  intradayTp1?: number;
  intradayTp2?: number;
  intradayTp3?: number;

  // Professional Strategic Recommendations
  shortTermRec?: {
    action: string;
    badge: string;
    reason: string;
    targetPrice: number;
    stopLoss: number;
  };
  longTermRec?: {
    action: string;
    badge: string;
    reason: string;
    targetPrice: number;
  };
}

export interface GoldPrices {
  goldUsdPerOz: number;
  usdEgpRate: number;
  fairGold24kEgp?: number;
  fairGold21kEgp?: number;
  fairGold18kEgp?: number;
  fairGoldCoinEgp?: number;
  gold24kEgp: number;
  gold21kEgp: number;
  gold18kEgp: number;
  goldCoinEgp: number;
  saghaPremiumEgp?: number;
  saghaPremiumPercent?: number;
  provider?: string;
  isCached?: boolean;
  charts?: {
    dates: string[];
    ounceSeries: number[];
    usdEgpSeries: number[];
    gold24kSeries: number[];
  };
  signalType: SignalType;
  rsi: number;
  shortTermRec?: {
    action: string;
    badge: string;
    reason: string;
    targetPrice24k: number;
    stopLoss24k: number;
    targetOunceUsd?: number;
    stopLossOunceUsd?: number;
  };
  longTermRec?: {
    action: string;
    badge: string;
    reason: string;
    targetPrice24k: number;
    targetOunceUsd?: number;
  };
}

export interface IntradayTrade {
  id: string;
  symbol: string;
  recommendationType: 'BUY' | 'STRONG_BUY' | 'NEUTRAL';
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  entryTime: string;
  closeTime?: string;
  status: 'OPEN' | 'CLOSED_TARGET_HIT' | 'CLOSED_STOP_LOSS_HIT';
  closePrice?: number;
  pnlPercentage?: number;
}

export interface SourceFairValueData {
  currentPrice: number;
  fairValue: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  upsidePercent: number;
  changePercent: number;
  volume: number;
  dayHigh?: number;
  dayLow?: number;
}

export type ConsensusStatus = 'STRONGLY_UNDERVALUED' | 'UNDERVALUED' | 'FAIR' | 'OVERVALUED' | 'STRONGLY_OVERVALUED';

export interface FairValueComparisonResult {
  symbol: string;
  nameEn: string;
  nameAr: string;
  sector: string;
  yahooSymbol?: string;
  isHalal?: boolean;
  shariaTier?: ShariaTier;
  currentPrice: number;
  sources: Record<string, SourceFairValueData>;
  fairValues: number[];
  averageFairValue: number;
  medianFairValue: number;
  minFairValue: number;
  maxFairValue: number;
  spreadPercent: number;
  averageUpsidePercent: number;
  consensusStatus: ConsensusStatus;
  highestDiscrepancySource: string | null;
}

export type ComparatorMetricType =
  | 'PRICE'
  | 'CHANGE_PERCENT'
  | 'VOLUME'
  | 'DAY_HIGH'
  | 'DAY_LOW'
  | 'FAIR_VALUE'
  | 'FAIR_VALUE_GRAHAM'
  | 'FAIR_VALUE_PE'
  | 'FAIR_VALUE_LYNCH'
  | 'FAIR_VALUE_PB'
  | 'UPSIDE_PERCENT'
  | 'NET_INCOME'
  | 'NET_PROFIT_MARGIN'
  | 'GROSS_PROFIT'
  | 'PE_RATIO'
  | 'EPS';

export interface SourcePriceData {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  dayHigh?: number;
  dayLow?: number;
  open?: number;
  fairValue?: number;
  fairValueGraham?: number;
  fairValuePE?: number;
  fairValueLynch?: number;
  fairValuePB?: number;
  upsidePercent?: number;
  peRatio?: number;
  eps?: number;
  pbRatio?: number;
  bvps?: number;
  roe?: number;
  dividendYield?: number;
  netIncome?: number;
  netIncomeRaw?: number;
  netIncomePeriod?: string;
  netIncomePeriodMonths?: number;
  netIncomeYear?: string;
  netProfitMargin?: number;
  grossProfit?: number;
  marketCap?: number;
  sharesCount?: number;
  periodNote?: string;
}

export type PriceAlignmentStatus = 'SYNCED' | 'MINOR_LAG' | 'DIVERGENT';

export interface PriceComparisonResult {
  symbol: string;
  nameEn: string;
  nameAr: string;
  sector: string;
  yahooSymbol?: string;
  isHalal?: boolean;
  shariaTier?: ShariaTier;
  sources: Record<string, SourcePriceData>;
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  priceSpreadPercent: number;
  alignmentStatus: PriceAlignmentStatus;
  highestVolumeSource: string;
  maxVolume: number;
  averageFairValue?: number;
  averageFairValueGraham?: number;
  averageFairValuePE?: number;
  averageFairValueLynch?: number;
  averageFairValuePB?: number;
  averageUpsidePercent?: number;
  averagePeRatio?: number;
  averageEps?: number;
  averageNetIncome?: number;
  averageNetProfitMargin?: number;
  averageGrossProfit?: number;
}

export type RotationPhaseType = 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'BASE_BUILDING';

export interface SectorRotationStock {
  symbol: string;
  nameAr: string;
  nameEn: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume10d: number;
  volumeSurge: number;
  turnoverEgp: number;
  rsi?: number;
  sma20?: number;
  sma50?: number;
  aboveSma20: boolean;
  marketCap: number;
  fairValue?: number;
  upsidePercent: number;
  peRatio?: number;
  eps?: number;
  pbRatio?: number;
  dividendYield?: number;
  netIncome?: number;
  netProfitMargin?: number;
  grossProfit?: number;
}

export interface SectorRotationGroup {
  sectorKey: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  category: string;
  stocksCount: number;
  totalTurnoverEgp: number;
  totalVolume: number;
  totalMarketCap: number;
  liquiditySharePercent: number;
  avgVolumeSurge: number;
  avgPriceChange: number;
  avgRsi?: number;
  avgPe?: number;
  avgUpsidePercent: number;
  avgNetMargin?: number;
  rotationPhase: RotationPhaseType;
  phaseLabelAr: string;
  phaseDescriptionAr: string;
  rotationScore: number;
  stocks: SectorRotationStock[];
}

export interface SectorRotationSummary {
  totalMarketTurnover: number;
  totalMarketVolume: number;
  totalMarketCap: number;
  totalStocksCount: number;
  totalSectorsCount: number;
  leadingSector: {
    sectorKey?: string;
    nameAr?: string;
    icon?: string;
    turnoverEgp?: number;
    liquiditySharePercent?: number;
  };
  topAccumulationSector: {
    sectorKey?: string;
    nameAr?: string;
    icon?: string;
    rotationScore?: number;
    avgVolumeSurge?: number;
    avgUpsidePercent?: number;
  };
  timestamp: string;
}

export interface SectorRotationResponse {
  summary: SectorRotationSummary;
  sectors: SectorRotationGroup[];
}

