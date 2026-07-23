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
}

export type SignalType = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

export interface TechnicalIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  macd?: {
    MACD?: number;
    signal?: number;
    histogram?: number;
  };
  support: number;
  resistance: number;
  volumeSpike: boolean;
  volumeRatio: number;
}

export interface StockAnalysisResult {
  quote: StockQuote;
  indicators: TechnicalIndicators;
  signalType: SignalType;
  reasons: string[];
  fairValue: number;
  fairValueUpsidePercent: number;
  suggestedEntry: { min: number; max: number };
  suggestedTarget: { target1: number; target2: number };
  suggestedStopLoss: number;
  timestamp: Date;
}

export interface AlertState {
  lastSignalType: SignalType;
  lastAlertTime: number;
  lastPrice: number;
}
