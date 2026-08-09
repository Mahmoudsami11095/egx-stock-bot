/**
 * Unified fair value engine — single source of truth for backend and Vercel API.
 *
 * Models (priority cascade when blending is not applicable):
 *   A) EPS × dynamic sector P/E
 *   B) BVPS × dynamic sector P/B
 *   C) DPS / required return (DDM)
 *   D) Fibonacci 52-week structural estimate
 *
 * Shared macro adjustments applied consistently across fundamental models:
 *   - CBE Interest Rate Macro Discount (with HIGH-confidence uplift on PE & PB)
 *   - Consensus Growth Modifier from analyst recommendation score
 *   - FX Devaluation Adjustment based on sector FX sensitivity
 *
 * Safety guardrails: Fair Value ∈ [0.75 × P_current, 2.00 × P_current]
 */

const CBE_CORRIDOR_INTEREST_RATE = Number(process.env.CBE_RATE || 0.2725);
const BASE_USD_EGP_RATE = 48.0;

const SECTOR_PE_MULTIPLIERS = {
  Pharmaceuticals: 18.0,
  'Food & Beverage': 16.0,
  Telecommunications: 14.0,
  Construction: 12.0,
  'Textiles & Consumer Goods': 13.0,
  'Industrial Cables & Energy': 12.0,
  'Oil & Gas': 10.0,
  Petrochemicals: 10.0,
  'Metals & Mining': 9.0,
  Banking: 8.0,
  'Real Estate': 11.0,
  'Investment Fund': 10.0,
  'Halal EGX': 13.5,
  General: 13.5,
};

const SECTOR_PB_MULTIPLIERS = {
  Pharmaceuticals: 3.5,
  'Food & Beverage': 3.2,
  Telecommunications: 3.0,
  Construction: 2.8,
  'Textiles & Consumer Goods': 2.5,
  'Industrial Cables & Energy': 2.8,
  'Oil & Gas': 2.2,
  Petrochemicals: 2.2,
  'Metals & Mining': 2.5,
  Banking: 1.8,
  'Real Estate': 2.8,
  'Investment Fund': 1.2,
  'Halal EGX': 2.5,
  General: 2.5,
};

const SECTOR_FX_SENSITIVITY = {
  Pharmaceuticals: -0.10,
  'Food & Beverage': -0.05,
  Telecommunications: 0.05,
  Construction: -0.05,
  'Textiles & Consumer Goods': 0.10,
  'Industrial Cables & Energy': 0.20,
  'Oil & Gas': 0.25,
  Petrochemicals: 0.20,
  'Metals & Mining': 0.15,
  Banking: -0.05,
  'Real Estate': 0.05,
  'Investment Fund': 0.0,
  General: 0.0,
};

const FUND_SYMBOLS = new Set(['EGREF', 'BTFH', 'ACAP', 'CCAP', 'ASPI', 'EFIH', 'BINV']);

/**
 * Match a sector key against an input sector string.
 *
 * Resolution order:
 *   1. Exact (case-insensitive) match.
 *   2. Explicit alias override for ambiguous terms (e.g. "Energy" → Oil & Gas,
 *      not "Industrial Cables & Energy").
 *   3. Best word-boundary overlap score: counts how many key words appear in
 *      the input and vice-versa; picks the most specific matching key.
 *   4. Legacy loose fallback: input fully contains a full key phrase.
 *
 * This avoids the false positive where "Energy" matched "Industrial Cables & Energy"
 * (12.0) instead of "Oil & Gas" (10.0) via naive substring matching.
 */
function matchSectorKey(sector, map) {
  if (!sector) return null;
  const lower = sector.toLowerCase().trim();

  // 1. Exact match
  for (const [key, val] of Object.entries(map)) {
    if (key.toLowerCase() === lower) return val;
  }

  // 2. Explicit alias override for ambiguous / common terms
  if (lower === 'energy' || lower === 'power' || lower === 'energies' || lower === 'electricity') {
    const oilGasVal = map['Oil & Gas'];
    if (oilGasVal !== undefined) return oilGasVal;
  }

  // 3. Best word-boundary overlap match (most specific key wins)
  const inputWords = lower.split(/[^a-z0-9]+/).filter(Boolean);
  let bestVal = null;
  let bestScore = 0;
  for (const [key, val] of Object.entries(map)) {
    const keyWords = key.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (keyWords.length === 0) continue;

    let keyWordsInInput = 0;
    for (const kw of keyWords) {
      if (inputWords.includes(kw)) keyWordsInInput++;
    }
    let inputWordsInKey = 0;
    for (const iw of inputWords) {
      if (keyWords.includes(iw)) inputWordsInKey++;
    }

    const score = keyWordsInInput + inputWordsInKey;
    if (score > bestScore) {
      bestScore = score;
      bestVal = val;
    }
  }
  if (bestVal !== null && bestScore > 0) return bestVal;

  // 4. Legacy loose fallback: input fully contains a key phrase
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key.toLowerCase())) return val;
  }

  return null;
}

function getSectorPE(sector) {
  return matchSectorKey(sector, SECTOR_PE_MULTIPLIERS) ?? 13.5;
}

function getSectorPB(sector) {
  return matchSectorKey(sector, SECTOR_PB_MULTIPLIERS) ?? 2.5;
}

function getStockFxSensitivity(sector) {
  return matchSectorKey(sector, SECTOR_FX_SENSITIVITY) ?? 0.0;
}

function getCbeMacroDiscountFactor(cbeRate = CBE_CORRIDOR_INTEREST_RATE) {
  const excessInterest = Math.max(0, cbeRate - 0.12);
  return Number(Math.max(0.75, 1 - excessInterest * 0.80).toFixed(3));
}

/**
 * Effective macro discount with HIGH-confidence uplift.
 * Applied symmetrically to both the P/E and P/B models.
 */
function getEffectiveCbeMacroDiscountFactor(cbeRate = CBE_CORRIDOR_INTEREST_RATE) {
  const baseDiscount = getCbeMacroDiscountFactor(cbeRate);
  return Number(Math.min(1, baseDiscount + 0.082).toFixed(3));
}

/**
 * Required return for the Dividend Discount Model, derived from the CBE corridor
 * rate so it stays consistent with the prevailing interest-rate environment.
 */
function getRequiredReturn(cbeRate = CBE_CORRIDOR_INTEREST_RATE) {
  return Math.max(0.12, cbeRate * 0.60);
}

/**
 * Infer sector from ticker symbol and company name (English or Arabic).
 * Order matters: check specific/overlapping categories before general ones.
 */
function inferSectorFromName(symbol, name = '') {
  const text = `${symbol} ${name}`.toLowerCase();

  if (FUND_SYMBOLS.has(symbol.toUpperCase()) || /\bfund\b|صندوق|for asset management|capital holdings|financial s\b/i.test(text)) {
    return 'Investment Fund';
  }
  if (/real estate|reit|property|housing|land reclamation|عقار|إسكان|تعمير|عقارية/i.test(text)) {
    return 'Real Estate';
  }
  if (/\bbank\b|مصرف|banking/i.test(text)) return 'Banking';
  // Oil & Gas BEFORE petrochemicals: "petroleum" contains "petro" but belongs to Oil & Gas
  if (/\boil\b|\bgas\b|زيت|petroleum|\bmineral\b|energy|طاقة/i.test(text)) return 'Oil & Gas';
  if (/pharma|pharmaceutical|farma|دواء/i.test(text)) return 'Pharmaceuticals';
  if (/fertilizer|أسمدة|petro|كيما|chemical|كيم/i.test(text)) return 'Petrochemicals';
  if (/food|beverage|dairy|غذائ|ألبان|domty|jufo|edita/i.test(text)) return 'Food & Beverage';
  if (/telecom|اتصالات|etel/i.test(text)) return 'Telecommunications';
  if (/construction|contracting|cement|أسمنت|orascom|بناء/i.test(text)) return 'Construction';
  if (/textile|weaving|spinning|نساج/i.test(text)) return 'Textiles & Consumer Goods';
  if (/electric|cable|كهرب/i.test(text)) return 'Industrial Cables & Energy';
  if (/alumin|metal|mining|steel|حديد|ألوم/i.test(text)) return 'Metals & Mining';
  if (/insurance|تأمين/i.test(text)) return 'General';

  return 'General';
}

function inferInstrumentType(symbol, sector, name = '') {
  const text = `${symbol} ${sector || ''} ${name}`.toLowerCase();
  if (FUND_SYMBOLS.has(symbol.toUpperCase()) || sector === 'Investment Fund' || /\bfund\b|صندوق/i.test(text)) {
    return 'FUND';
  }
  if (sector === 'Real Estate' || /real estate|reit|عقار/i.test(text)) return 'REAL_ESTATE';
  if (sector === 'Banking' || /\bbank\b|مصرف/i.test(text)) return 'BANK';
  return 'EQUITY';
}

function blendPePb(fvPe, fvPb, instrumentType) {
  if (instrumentType === 'FUND') {
    return { value: 0.15 * fvPe + 0.85 * fvPb, confidence: 'MEDIUM' };
  }
  if (instrumentType === 'REAL_ESTATE') {
    return { value: 0.35 * fvPe + 0.65 * fvPb, confidence: 'HIGH' };
  }
  if (instrumentType === 'BANK') {
    return { value: 0.40 * fvPe + 0.60 * fvPb, confidence: 'HIGH' };
  }
  if (fvPe > fvPb * 1.5) return { value: 0.90 * fvPe + 0.10 * fvPb, confidence: 'HIGH' };
  if (fvPe > fvPb * 1.2) return { value: 0.75 * fvPe + 0.25 * fvPb, confidence: 'HIGH' };
  return { value: 0.50 * fvPe + 0.50 * fvPb, confidence: 'HIGH' };
}

/**
 * Validate and normalize numerical inputs.
 * @returns {boolean} true if the value is a finite positive number.
 */
function isValidPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * @param {object} params
 * @param {number|null|undefined} params.eps
 * @param {number|null|undefined} params.bvps
 * @param {number|null|undefined} params.dps
 * @param {number} params.currentPrice
 * @param {number} params.low52
 * @param {number} params.high52
 * @param {number} [params.volRatio=1]
 * @param {number|null|undefined} [params.recommendScore=0]
 * @param {string} [params.sector='General']
 * @param {number} [params.usdEgpRate=49.5]
 * @param {'HIGH'|'MEDIUM'|'LOW'} [params.epsConfidence='LOW']
 * @param {string} [params.symbol='']
 * @param {string} [params.name='']
 */
function computeFairValue(params) {
  const {
    eps,
    bvps,
    dps,
    currentPrice,
    low52,
    high52,
    volRatio = 1,
    recommendScore = 0,
    sector = 'General',
    usdEgpRate = 49.5,
    epsConfidence = 'LOW',
    symbol = '',
    name = '',
  } = params;

  // ─── Input validation ──────────────────────────────────────────────────
  if (!isValidPositiveNumber(currentPrice)) {
    throw new Error('computeFairValue: currentPrice must be a finite positive number');
  }

  // Normalize / validate 52-week bounds
  let low52Norm = low52;
  let high52Norm = high52;
  if (!isValidPositiveNumber(low52Norm)) {
    low52Norm = currentPrice * 0.75;
  }
  if (!isValidPositiveNumber(high52Norm)) {
    high52Norm = currentPrice * 2.0;
  }
  if (high52Norm < low52Norm) {
    // Swap to normalize inverted bounds instead of producing a nonsense midpoint
    const tmp = low52Norm;
    low52Norm = high52Norm;
    high52Norm = tmp;
  }

  const macroDiscount = getCbeMacroDiscountFactor();
  const effectiveMacroDiscount = getEffectiveCbeMacroDiscountFactor();
  const clampedScore = Math.max(-1, Math.min(1, Number(recommendScore) || 0));
  const consensusGrowthModifier = 1 + clampedScore * 0.05;
  const fxSensitivity = getStockFxSensitivity(sector);
  const devaluationPct = Math.max(0, (usdEgpRate - BASE_USD_EGP_RATE) / BASE_USD_EGP_RATE);
  const fxDevaluationAdjustment = 1 + fxSensitivity * devaluationPct;

  // HIGH-confidence EPS attracts the effective (uplifted) macro discount symmetrically
  const isHighConfidence = epsConfidence === 'HIGH';
  const macroForFundamentals = isHighConfidence ? effectiveMacroDiscount : macroDiscount;

  const baseSectorPE = getSectorPE(sector);
  const baseSectorPB = getSectorPB(sector);
  const instrumentType = inferInstrumentType(symbol, sector, name);

  let fvPe = null;
  let fvPb = null;

  if (isValidPositiveNumber(eps)) {
    const dynamicPE = baseSectorPE * consensusGrowthModifier * macroForFundamentals * fxDevaluationAdjustment;
    fvPe = eps * dynamicPE;
  }

  if (isValidPositiveNumber(bvps)) {
    const dynamicPB = baseSectorPB * consensusGrowthModifier * macroForFundamentals * fxDevaluationAdjustment;
    fvPb = bvps * dynamicPB;
  }

  let fairValueRaw = null;
  let confidence = 'LOW';

  if (fvPe && fvPb) {
    const blended = blendPePb(fvPe, fvPb, instrumentType);
    fairValueRaw = blended.value;
    confidence = blended.confidence;
  } else if (fvPe) {
    fairValueRaw = fvPe;
    confidence = isHighConfidence ? 'HIGH' : 'MEDIUM';
  } else if (fvPb) {
    fairValueRaw = fvPb;
    confidence = 'MEDIUM';
  } else if (isValidPositiveNumber(dps)) {
    const requiredReturn = getRequiredReturn();
    fairValueRaw = (dps / requiredReturn) * consensusGrowthModifier * macroDiscount * fxDevaluationAdjustment;
    confidence = 'MEDIUM';
  }

  if (fairValueRaw && isValidPositiveNumber(fairValueRaw)) {
    const clamped = Math.max(currentPrice * 0.75, Math.min(currentPrice * 2.00, fairValueRaw));
    return { fairValue: Number(clamped.toFixed(2)), confidence };
  }

  // ─── Model D fallback: Fibonacci structural estimate ──────────────────
  const rangeMidpoint = low52Norm + 0.618 * (high52Norm - low52Norm);
  const volWeight = Math.min(Math.max(Number(volRatio) || 1, 0), 2.0);
  const scoreFactor = 1 + clampedScore * 0.1;
  let estVal = rangeMidpoint * (0.85 + 0.15 * volWeight) * scoreFactor * macroDiscount * fxDevaluationAdjustment;
  if (scoreFactor >= 1) {
    estVal = Math.max(estVal, currentPrice * scoreFactor);
  }
  const clampedFallback = Math.max(currentPrice * 0.75, Math.min(currentPrice * 2.00, estVal));
  return { fairValue: Number(clampedFallback.toFixed(2)), confidence: 'LOW' };
}

module.exports = {
  computeFairValue,
  inferSectorFromName,
  inferInstrumentType,
  getSectorPE,
  getSectorPB,
  getStockFxSensitivity,
  getCbeMacroDiscountFactor,
  getEffectiveCbeMacroDiscountFactor,
  getRequiredReturn,
  SECTOR_PE_MULTIPLIERS,
  SECTOR_PB_MULTIPLIERS,
  BASE_USD_EGP_RATE,
};