export type SignalType = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
export type ShariaTier = 'COMPLIANT' | 'MARGINAL' | 'NON_COMPLIANT' | 'UNDER_REVIEW';

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
  shariaTier: ShariaTier;
  shariaStatusText: string;
  purificationPercent?: number;
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
