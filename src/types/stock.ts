export interface Candle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockQuote {
  symbol: string;
  yahooSymbol: string;
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
  marketCap?: number;
  dividendYield?: number;
  dividendPerShare?: number;
}

export type SignalType = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
export type FairValueConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type MarketRegime = 'BULLISH' | 'BEARISH' | 'UNKNOWN';
export type DataSource = 'tradingview' | 'investing' | 'yahoo' | 'eodhd' | 'egx_live_ws';

export interface WsPriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  timestamp: number;
  source: DataSource;
}

export interface TechnicalIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  macd?: {
    macd?: number;
    signal?: number;
    histogram?: number;
  };
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
  fairValueConfidence: FairValueConfidence;
  fairValueUpsidePercent: number;
  marketRegime: MarketRegime;
  suggestedEntry: { min: number; max: number };
  suggestedTarget: { target1: number; target2: number };
  suggestedStopLoss: number;
  positionSizePercent: number;
  riskRewardRatio: number;
  timestamp: Date;
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

  // Intraday (scalping/session) trading fields
  intradaySignal?: SignalType;
  intradayScore?: number;
  intradayReasons?: string[];
  intradayEntry?: number;
  intradayTarget?: number;
  intradayStopLoss?: number;

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

  // AI-Extracted Fundamental Data
  fundamentals?: {
    netProfit: number | null;
    revenue: number | null;
    fiscalYear: string | null;
    currency: string | null;
    lastUpdated: number;
  };
}

export interface AlertState {
  lastSignalType: SignalType;
  lastAlertTime: number;
  lastPrice: number;
}

export interface IntradayTrade {
  id: string;
  symbol: string;
  recommendationType: 'BUY' | 'STRONG_BUY' | 'NEUTRAL';
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  entryTime: string;
  closeTime?: string;
  status: 'OPEN' | 'CLOSED_TARGET_HIT' | 'CLOSED_STOP_LOSS_HIT';
  closePrice?: number;
  pnlPercentage?: number;
}
