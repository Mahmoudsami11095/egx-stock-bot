export interface FairValueResult {
  fairValue: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface FairValueParams {
  eps?: number | null;
  bvps?: number | null;
  dps?: number | null;
  currentPrice: number;
  low52?: number;
  high52?: number;
  volRatio?: number;
  recommendScore?: number | null;
  sector?: string;
  usdEgpRate?: number;
  epsConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  symbol?: string;
  name?: string;
}

export function computeFairValue(params: FairValueParams): FairValueResult;

export function inferSectorFromName(nameEn: string, fallbackName?: string): string;
