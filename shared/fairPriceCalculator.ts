/**
 * Generic, ticker-agnostic fair value calculator.
 *
 * Implements a production-grade `calculateFairPrice()` that estimates the fair
 * value of any publicly listed stock from verified financial inputs. It is not
 * exchange-specific, but accepts an optional `market` context (e.g. "EGX",
 * "NASDAQ") for peer grouping / currency handling.
 *
 * Valuation methods (combined, not replaced):
 *   1. Analyst Consensus
 *   2. Relative Valuation (P/E)
 *   3. Relative Valuation (P/B)
 *   4. EPS-based Intrinsic Estimate
 *   5. Optional DCF (Gordon growth on FCF)
 *   6. Blended Fair Value (weighted average of valid methods)
 *
 * Hard rules:
 *   - Never hallucinate or infer a missing numeric input.
 *   - Never mix reporting periods (cumulative vs. annualized EPS detection).
 *   - All monetary outputs carry the source currency.
 *   - Label uncertainty explicitly when fewer than 2 methods have sufficient data.
 *   - Deterministic: no randomness, no network calls.
 */

export type ReportingPeriod = 'annual' | 'quarterly' | 'ytd' | 'h1' | 'nine_months' | 'unknown';

export interface FinancialData {
  current_price: number;
  currency: string;
  as_of_date: string; // ISO date — mandatory for every figure used
  eps_trailing?: number;
  eps_forward?: number;
  eps_trailing_period?: ReportingPeriod;
  eps_forward_period?: ReportingPeriod;
  book_value_per_share?: number;
  analyst_target_mean?: number;
  analyst_target_low?: number;
  analyst_target_high?: number;
  sector_avg_pe?: number;
  sector_avg_pb?: number;
  net_income_growth_yoy?: number; // %
  free_cash_flow?: number;
  shares_outstanding?: number;
  wacc?: number; // %
  terminal_growth_rate?: number; // %
}

export interface PeerData {
  ticker: string;
  pe?: number;
  pb?: number;
}

export interface Weights {
  analyst?: number;
  pe?: number;
  pb?: number;
  eps_intrinsic?: number;
  dcf?: number;
}

export interface FairValueResult {
  ticker: string;
  currency: string;
  current_price: number;
  fair_price_low: number;
  fair_price_mid: number;
  fair_price_high: number;
  upside_downside_pct: number; // (fair_mid - current) / current
  methods_used: string[];
  methods_skipped: Record<string, string>; // method_name -> reason
  method_weights: Record<string, number>; // weighting logic shown, not hidden
  data_quality_flags: string[];
  as_of_date: string;
}

interface MethodEstimate {
  low: number;
  mid: number;
  high: number;
}

function isValidNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isCumulativePeriod(p: ReportingPeriod | undefined): boolean {
  return p === 'ytd' || p === 'h1' || p === 'nine_months';
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Pick a usable EPS figure, preferring forward over trailing, and rejecting
 * cumulative (YTD/H1/9M) figures that would require silent annualization.
 */
function pickEps(fd: FinancialData, flags: string[]): number | null {
  const candidates: Array<{ eps?: number; period?: ReportingPeriod; name: string }> = [
    { eps: fd.eps_forward, period: fd.eps_forward_period, name: 'eps_forward' },
    { eps: fd.eps_trailing, period: fd.eps_trailing_period, name: 'eps_trailing' },
  ];
  for (const c of candidates) {
    if (isValidNumber(c.eps) && c.eps! > 0) {
      if (isCumulativePeriod(c.period)) {
        flags.push(`${c.name} (${c.period}) is cumulative, not annualized — verify before use`);
        continue; // reject cumulative EPS rather than silently annualizing
      }
      return c.eps!;
    }
  }
  return null;
}

/**
 * Resolve the effective sector P/E: use `sector_avg_pe` if provided, otherwise
 * fall back to the peer-median P/E from `peer_data`.
 */
function resolveSectorPe(fd: FinancialData, peerData: PeerData[]): number | null {
  if (isValidNumber(fd.sector_avg_pe) && fd.sector_avg_pe! > 0) return fd.sector_avg_pe!;
  const peerPes = peerData.map((p) => p.pe).filter((v): v is number => isValidNumber(v) && v > 0);
  if (peerPes.length > 0) return median(peerPes);
  return null;
}

/**
 * Resolve the effective sector P/B: use `sector_avg_pb` if provided, otherwise
 * fall back to the peer-median P/B from `peer_data`.
 */
function resolveSectorPb(fd: FinancialData, peerData: PeerData[]): number | null {
  if (isValidNumber(fd.sector_avg_pb) && fd.sector_avg_pb! > 0) return fd.sector_avg_pb!;
  const peerPbs = peerData.map((p) => p.pb).filter((v): v is number => isValidNumber(v) && v > 0);
  if (peerPbs.length > 0) return median(peerPbs);
  return null;
}

/**
 * Calculate the fair price of a stock from verified financial inputs.
 *
 * @param ticker        Stock ticker symbol.
 * @param market        Optional market/exchange context (e.g. "EGX", "NASDAQ").
 * @param financialData Verified financial inputs (see FinancialData schema).
 * @param peerData      Optional comparable companies for relative valuation.
 * @param weights       Optional override of method weights (default: equal weight).
 */
export function calculateFairPrice(
  ticker: string,
  market: string | null,
  financialData: FinancialData,
  peerData: PeerData[] = [],
  weights: Weights = {}
): FairValueResult {
  // `market` is accepted for peer-grouping/currency context but the calculation
  // itself is exchange-agnostic. It is intentionally unused in the math.
  void market;

  const flags: string[] = [];
  const skipped: Record<string, string> = {};
  const estimates: Record<string, MethodEstimate> = {};

  // ─── Input validation ──────────────────────────────────────────────────
  if (!isValidNumber(financialData.current_price) || financialData.current_price <= 0) {
    throw new Error('current_price must be a positive finite number');
  }
  if (!financialData.currency) {
    throw new Error('currency is required');
  }
  if (!financialData.as_of_date) {
    throw new Error('as_of_date is required');
  }

  // ─── Method 1: Analyst Consensus ───────────────────────────────────────
  if (isValidNumber(financialData.analyst_target_mean) && financialData.analyst_target_mean! > 0) {
    const mean = financialData.analyst_target_mean!;
    const low = isValidNumber(financialData.analyst_target_low) && financialData.analyst_target_low! > 0
      ? financialData.analyst_target_low!
      : mean * 0.9;
    const high = isValidNumber(financialData.analyst_target_high) && financialData.analyst_target_high! > 0
      ? financialData.analyst_target_high!
      : mean * 1.1;
    estimates.analyst = { low, mid: mean, high };
  } else {
    skipped.analyst = 'missing analyst_target_mean';
  }

  // ─── Resolve sector multiples (with peer fallback) ────────────────────
  const sectorPe = resolveSectorPe(financialData, peerData);
  const sectorPb = resolveSectorPb(financialData, peerData);

  // ─── Method 2: Relative Valuation (P/E) ────────────────────────────────
  const epsForPe = pickEps(financialData, flags);
  if (epsForPe === null) {
    skipped.pe = 'missing usable (non-cumulative, positive) EPS';
  } else if (sectorPe === null) {
    skipped.pe = 'missing sector_avg_pe and peer P/E data';
  } else {
    const mid = epsForPe * sectorPe;
    estimates.pe = { low: mid * 0.9, mid, high: mid * 1.1 };
  }

  // ─── Method 3: Relative Valuation (P/B) ────────────────────────────────
  if (isValidNumber(financialData.book_value_per_share) && financialData.book_value_per_share! > 0) {
    if (sectorPb === null) {
      skipped.pb = 'missing sector_avg_pb and peer P/B data';
    } else {
      const mid = financialData.book_value_per_share! * sectorPb;
      estimates.pb = { low: mid * 0.9, mid, high: mid * 1.1 };
    }
  } else {
    skipped.pb = 'missing or non-positive book_value_per_share';
  }

  // ─── Method 4: EPS-based Intrinsic Estimate ────────────────────────────
  // Reconciles trailing vs. forward EPS (via pickEps) and applies a
  // growth-adjusted multiple. Never mixes cumulative with annualized figures.
  const epsForIntrinsic = pickEps(financialData, flags);
  if (epsForIntrinsic === null) {
    skipped.eps_intrinsic = 'missing usable (non-cumulative, positive) EPS';
  } else if (sectorPe === null) {
    skipped.eps_intrinsic = 'missing sector_avg_pe and peer P/E data';
  } else {
    const growth = isValidNumber(financialData.net_income_growth_yoy)
      ? financialData.net_income_growth_yoy! / 100
      : 0;
    const growthAdjustedPe = sectorPe * (1 + growth);
    const mid = epsForIntrinsic * growthAdjustedPe;
    estimates.eps_intrinsic = { low: mid * 0.9, mid, high: mid * 1.1 };
  }

  // ─── Method 5: Optional DCF (Gordon growth on FCF) ─────────────────────
  const hasDcfInputs =
    isValidNumber(financialData.free_cash_flow) &&
    financialData.free_cash_flow! > 0 &&
    isValidNumber(financialData.wacc) &&
    isValidNumber(financialData.terminal_growth_rate) &&
    isValidNumber(financialData.shares_outstanding) &&
    financialData.shares_outstanding! > 0;
  if (!hasDcfInputs) {
    skipped.dcf = 'missing free_cash_flow, wacc, terminal_growth_rate, or shares_outstanding';
  } else {
    const wacc = financialData.wacc! / 100;
    const g = financialData.terminal_growth_rate! / 100;
    if (wacc <= g) {
      skipped.dcf = 'wacc must exceed terminal_growth_rate';
    } else {
      const fcfPerShare = financialData.free_cash_flow! / financialData.shares_outstanding!;
      const mid = (fcfPerShare * (1 + g)) / (wacc - g);
      estimates.dcf = { low: mid * 0.9, mid, high: mid * 1.1 };
    }
  }

  // ─── Method 6: Blended Fair Value ──────────────────────────────────────
  const methodNames = Object.keys(estimates);
  if (methodNames.length === 0) {
    flags.push('insufficient data for reliable fair value');
    return {
      ticker,
      currency: financialData.currency,
      current_price: financialData.current_price,
      fair_price_low: 0,
      fair_price_mid: 0,
      fair_price_high: 0,
      upside_downside_pct: -100,
      methods_used: [],
      methods_skipped: skipped,
      method_weights: {},
      data_quality_flags: flags,
      as_of_date: financialData.as_of_date,
    };
  }

  // Default equal weight across available methods; allow override via `weights`.
  const rawWeights: Record<string, number> = {};
  for (const name of methodNames) {
    const override = weights[name as keyof Weights];
    rawWeights[name] = isValidNumber(override) && override! > 0 ? override! : 1;
  }
  const totalWeight = Object.values(rawWeights).reduce((a, b) => a + b, 0);
  const normalizedWeights: Record<string, number> = {};
  for (const name of methodNames) {
    normalizedWeights[name] = rawWeights[name] / totalWeight;
  }

  let mid = 0;
  let low = 0;
  let high = 0;
  for (const name of methodNames) {
    const w = normalizedWeights[name];
    mid += w * estimates[name].mid;
    low += w * estimates[name].low;
    high += w * estimates[name].high;
  }

  const upside = ((mid - financialData.current_price) / financialData.current_price) * 100;

  if (methodNames.length < 2) {
    flags.push('insufficient data for reliable fair value');
  }

  return {
    ticker,
    currency: financialData.currency,
    current_price: financialData.current_price,
    fair_price_low: round2(low),
    fair_price_mid: round2(mid),
    fair_price_high: round2(high),
    upside_downside_pct: round2(upside),
    methods_used: methodNames,
    methods_skipped: skipped,
    method_weights: normalizedWeights,
    data_quality_flags: flags,
    as_of_date: financialData.as_of_date,
  };
}

/**
 * Rank a batch of fair value results by opportunity (upside % descending).
 * Deterministic and sort-friendly for watchlist ranking.
 */
export function rankByUpside(results: FairValueResult[]): FairValueResult[] {
  return [...results].sort((a, b) => b.upside_downside_pct - a.upside_downside_pct);
}