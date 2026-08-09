/**
 * Comprehensive unit tests for the unified fair value engine (shared/fairValueEngine.js).
 *
 * Run with: node test_fair_value.js
 */

const assert = require('assert');
const {
  computeFairValue,
  inferSectorFromName,
  inferInstrumentType,
  getSectorPE,
  getSectorPB,
  getStockFxSensitivity,
  getCbeMacroDiscountFactor,
  getEffectiveCbeMacroDiscountFactor,
  getRequiredReturn,
} = require('./shared/fairValueEngine');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
  }
}

function approx(actual, expected, tolerance = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

// ─── Sector multiplier lookup ───────────────────────────────────────────────
console.log('\n📊 Sector Multiplier Lookup');

test('getSectorPE exact match (Banking → 8.0)', () => {
  assert.strictEqual(getSectorPE('Banking'), 8.0);
});

test('getSectorPE exact match (Pharmaceuticals → 18.0)', () => {
  assert.strictEqual(getSectorPE('Pharmaceuticals'), 18.0);
});

test('getSectorPE word-boundary match (food → Food & Beverage)', () => {
  assert.strictEqual(getSectorPE('Food'), 16.0);
});

test('getSectorPE word-boundary match (Oil Gas → Oil & Gas)', () => {
  assert.strictEqual(getSectorPE('Oil Gas'), 10.0);
});

test('getSectorPE "Energy" alone maps to Oil & Gas (10.0), not Industrial Cables & Energy (12.0)', () => {
  // "energy" alone should NOT match "Industrial Cables & Energy" (12.0).
  // The explicit alias maps ambiguous "Energy" to the primary energy sector (Oil & Gas, 10.0).
  assert.strictEqual(getSectorPE('Energy'), 10.0);
});

test('getSectorPB exact match (Banking → 1.8)', () => {
  assert.strictEqual(getSectorPB('Banking'), 1.8);
});

test('getStockFxSensitivity exact match (Oil & Gas → 0.25)', () => {
  assert.strictEqual(getStockFxSensitivity('Oil & Gas'), 0.25);
});

test('getStockFxSensitivity default (Unknown → 0.0)', () => {
  assert.strictEqual(getStockFxSensitivity('Unknown Sector'), 0.0);
});

test('getStockFxSensitivity loose fallback still works (Banking)', () => {
  assert.strictEqual(getStockFxSensitivity('Banking'), -0.05);
});

// ─── Macro adjustments ──────────────────────────────────────────────────────
console.log('\n🧮 Macro Adjustments');

test('getCbeMacroDiscountFactor at 27.25% ≈ 0.878', () => {
  const d = getCbeMacroDiscountFactor(0.2725);
  approx(d, 0.878, 0.001);
});

test('getCbeMacroDiscountFactor clamps at 0.75 floor', () => {
  const d = getCbeMacroDiscountFactor(0.60); // excess = 0.48 → 1 - 0.384 = 0.616 → floor 0.75
  assert.strictEqual(d, 0.75);
});

test('getCbeMacroDiscountFactor no discount below 12%', () => {
  const d = getCbeMacroDiscountFactor(0.10);
  assert.strictEqual(d, 1.0);
});

test('getEffectiveCbeMacroDiscountFactor = base + 0.082', () => {
  const base = getCbeMacroDiscountFactor(0.2725);
  const effective = getEffectiveCbeMacroDiscountFactor(0.2725);
  approx(effective, base + 0.082, 0.001);
});

test('getEffectiveCbeMacroDiscountFactor clamps at 1.0', () => {
  const effective = getEffectiveCbeMacroDiscountFactor(0.05);
  assert.strictEqual(effective, 1.0);
});

test('getRequiredReturn derives from CBE rate (27.25% → 16.35%)', () => {
  const r = getRequiredReturn(0.2725);
  approx(r, 0.1635, 0.001);
});

test('getRequiredReturn floors at 12%', () => {
  const r = getRequiredReturn(0.10);
  assert.strictEqual(r, 0.12);
});

// ─── Sector inference ───────────────────────────────────────────────────────
console.log('\n🏭 Sector & Instrument Type Inference');

test('inferSectorFromName: Petroleum Marine Services → Oil & Gas', () => {
  assert.strictEqual(inferSectorFromName('PMSC', 'Petroleum Marine Services'), 'Oil & Gas');
});

test('inferSectorFromName: Sidpec petrochemicals → Petrochemicals', () => {
  assert.strictEqual(inferSectorFromName('SKPC', 'Sidi Kerir Petrochemicals'), 'Petrochemicals');
});

test('inferSectorFromName: fertilizer → Petrochemicals', () => {
  assert.strictEqual(inferSectorFromName('ABUK', 'Abu Qir Fertilizers'), 'Petrochemicals');
});

test('inferSectorFromName: bank → Banking', () => {
  assert.strictEqual(inferSectorFromName('COMI', 'Commercial International Bank'), 'Banking');
});

test('inferSectorFromName: pharma → Pharmaceuticals', () => {
  assert.strictEqual(inferSectorFromName('NIPH', 'El-Nile Pharmaceutical'), 'Pharmaceuticals');
});

test('inferSectorFromName: real estate → Real Estate', () => {
  assert.strictEqual(inferSectorFromName('TMGH', 'Talaat Moustafa Real Estate'), 'Real Estate');
});

test('inferSectorFromName: fund symbol → Investment Fund', () => {
  assert.strictEqual(inferSectorFromName('EGREF', 'Egyptian Real Estate Fund'), 'Investment Fund');
});

test('inferSectorFromName: construction → Construction', () => {
  assert.strictEqual(inferSectorFromName('ORAS', 'Orascom Construction'), 'Construction');
});

test('inferSectorFromName: telecom → Telecommunications', () => {
  assert.strictEqual(inferSectorFromName('ETEL', 'Telecom Egypt'), 'Telecommunications');
});

test('inferInstrumentType: fund → FUND', () => {
  assert.strictEqual(inferInstrumentType('EGREF', 'Investment Fund', 'Fund'), 'FUND');
});

test('inferInstrumentType: bank → BANK', () => {
  assert.strictEqual(inferInstrumentType('COMI', 'Banking', 'Bank'), 'BANK');
});

test('inferInstrumentType: real estate → REAL_ESTATE', () => {
  assert.strictEqual(inferInstrumentType('TMGH', 'Real Estate', 'Property'), 'REAL_ESTATE');
});

test('inferInstrumentType: generic equity → EQUITY', () => {
  assert.strictEqual(inferInstrumentType('SWDY', 'Industrial Cables & Energy', 'Elsewedy'), 'EQUITY');
});

// ─── Fundamental model: P/E only ────────────────────────────────────────────
console.log('\n💰 P/E Model');

test('P/E model: positive EPS with General sector', () => {
  const { fairValue, confidence } = computeFairValue({
    eps: 5.0,
    currentPrice: 50,
    low52: 30,
    high52: 70,
    sector: 'General',
    usdEgpRate: 48.0, // no FX adjustment
  });
  // FairValue = EPS × 13.5 × 1.0 × 0.878 × 1.0 = 59.27
  approx(fairValue, 5.0 * 13.5 * getCbeMacroDiscountFactor(0.2725), 0.05);
  assert.strictEqual(confidence, 'MEDIUM');
});

test('P/E model: HIGH confidence EPS gets effective macro discount', () => {
  const lowConf = computeFairValue({
    eps: 5.0, currentPrice: 50, low52: 30, high52: 70,
    sector: 'General', usdEgpRate: 48.0, epsConfidence: 'LOW',
  });
  const highConf = computeFairValue({
    eps: 5.0, currentPrice: 50, low52: 30, high52: 70,
    sector: 'General', usdEgpRate: 48.0, epsConfidence: 'HIGH',
  });
  assert.ok(highConf.fairValue > lowConf.fairValue, 'HIGH confidence should boost fair value');
  assert.strictEqual(highConf.confidence, 'HIGH');
});

test('P/E model: recommendScore boosts multiplier', () => {
  const neutral = computeFairValue({
    eps: 5.0, currentPrice: 50, low52: 30, high52: 70,
    sector: 'General', usdEgpRate: 48.0, recommendScore: 0,
  });
  const bullish = computeFairValue({
    eps: 5.0, currentPrice: 50, low52: 30, high52: 70,
    sector: 'General', usdEgpRate: 48.0, recommendScore: 1,
  });
  assert.ok(bullish.fairValue > neutral.fairValue);
});

test('P/E model: FX devaluation boosts exporter (Oil & Gas +0.25)', () => {
  const noFx = computeFairValue({
    eps: 5.0, currentPrice: 50, low52: 30, high52: 70,
    sector: 'Oil & Gas', usdEgpRate: 48.0,
  });
  const deval = computeFairValue({
    eps: 5.0, currentPrice: 50, low52: 30, high52: 70,
    sector: 'Oil & Gas', usdEgpRate: 50.0, // +4.17% devaluation
  });
  assert.ok(deval.fairValue > noFx.fairValue, 'FX adjustment should increase exporter value');
});

test('P/E model: negative EPS treated as unavailable → fallback', () => {
  const result = computeFairValue({
    eps: -3.0, currentPrice: 50, low52: 30, high52: 70,
    sector: 'General', usdEgpRate: 48.0,
  });
  assert.strictEqual(result.confidence, 'LOW'); // Fibonacci fallback
  assert.ok(result.fairValue > 0);
});

// ─── Fundamental model: P/B only ────────────────────────────────────────────
console.log('\n📚 P/B Model');

test('P/B model: positive BVPS only', () => {
  const { fairValue, confidence } = computeFairValue({
    bvps: 20.0,
    currentPrice: 30,
    low52: 20,
    high52: 40,
    sector: 'Banking',
    usdEgpRate: 48.0,
  });
  // FairValue = BVPS × 1.8 × 0.878 = 31.61
  approx(fairValue, 20.0 * 1.8 * getCbeMacroDiscountFactor(0.2725), 0.05);
  assert.strictEqual(confidence, 'MEDIUM');
});

test('P/B model: HIGH confidence EPS applies uplift to PB too', () => {
  const lowConf = computeFairValue({
    bvps: 20.0, currentPrice: 30, low52: 20, high52: 40,
    sector: 'Banking', usdEgpRate: 48.0, epsConfidence: 'LOW',
  });
  const highConf = computeFairValue({
    bvps: 20.0, currentPrice: 30, low52: 20, high52: 40,
    sector: 'Banking', usdEgpRate: 48.0, epsConfidence: 'HIGH',
  });
  assert.ok(highConf.fairValue > lowConf.fairValue, 'HIGH confidence should also uplift PB model');
});

// ─── Instrument-aware blending ──────────────────────────────────────────────
console.log('\n⚖️  Instrument-Aware Blending');

test('Blend: bank uses 40/60 PE/PB weights', () => {
  const epsOnly = computeFairValue({
    eps: 5.0, currentPrice: 50, low52: 30, high52: 70,
    sector: 'Banking', usdEgpRate: 48.0,
  });
  const bvpsOnly = computeFairValue({
    bvps: 20.0, currentPrice: 50, low52: 30, high52: 70,
    sector: 'Banking', usdEgpRate: 48.0,
  });
  const both = computeFairValue({
    eps: 5.0, bvps: 20.0, currentPrice: 50, low52: 30, high52: 70,
    sector: 'Banking', usdEgpRate: 48.0,
  });
  const expected = 0.40 * epsOnly.fairValue + 0.60 * bvpsOnly.fairValue;
  approx(both.fairValue, expected, 0.10);
  assert.strictEqual(both.confidence, 'HIGH');
});

test('Blend: fund uses 15/85 PE/PB weights', () => {
  const epsOnly = computeFairValue({
    eps: 2.0, currentPrice: 20, low52: 10, high52: 30,
    sector: 'Investment Fund', usdEgpRate: 48.0, symbol: 'EGREF',
  });
  const bvpsOnly = computeFairValue({
    bvps: 15.0, currentPrice: 20, low52: 10, high52: 30,
    sector: 'Investment Fund', usdEgpRate: 48.0, symbol: 'EGREF',
  });
  const both = computeFairValue({
    eps: 2.0, bvps: 15.0, currentPrice: 20, low52: 10, high52: 30,
    sector: 'Investment Fund', usdEgpRate: 48.0, symbol: 'EGREF',
  });
  const expected = 0.15 * epsOnly.fairValue + 0.85 * bvpsOnly.fairValue;
  approx(both.fairValue, expected, 0.10);
  assert.strictEqual(both.confidence, 'MEDIUM');
});

test('Blend: real estate uses 35/65 PE/PB weights', () => {
  // Chosen EPS/BVPS so both raw model values stay inside the [0.75×, 2.00×] clamp,
  // allowing direct verification of the blend weights.
  const both = computeFairValue({
    eps: 2.0, bvps: 15.0, currentPrice: 40, low52: 25, high52: 60,
    sector: 'Real Estate', usdEgpRate: 48.0,
  });
  assert.strictEqual(both.confidence, 'HIGH');
  // Reconstruct raw model values from the exported sector multipliers & macro factors.
  const macro = getCbeMacroDiscountFactor(0.2725);
  const fvPe = 2.0 * getSectorPE('Real Estate') * macro;        // 2.0 × 11.0 × 0.878
  const fvPb = 15.0 * getSectorPB('Real Estate') * macro;       // 15.0 × 2.8 × 0.878
  const expected = 0.35 * fvPe + 0.65 * fvPb;
  approx(both.fairValue, expected, 0.10);
});

// ─── DDM model ──────────────────────────────────────────────────────────────
console.log('\n💵 Dividend Discount Model');

test('DDM: DPS only with FX adjustment', () => {
  // Choose DPS such that the raw DDM value stays inside the [0.75×, 2.00×] clamp:
  //   raw = (4.0 / 0.1635) × 0.878 × 1.0104 ≈ 21.70  (currentPrice=25 → corridor [18.75, 50])
  const { fairValue, confidence } = computeFairValue({
    dps: 4.0,
    currentPrice: 25,
    low52: 15,
    high52: 35,
    sector: 'Oil & Gas',
    usdEgpRate: 50.0,
  });
  const requiredReturn = getRequiredReturn(0.2725); // 0.1635
  const fxAdj = 1 + 0.25 * ((50 - 48) / 48); // 1.0104
  const expected = (4.0 / requiredReturn) * getCbeMacroDiscountFactor(0.2725) * fxAdj;
  approx(fairValue, expected, 0.05);
  assert.strictEqual(confidence, 'MEDIUM');
});

test('DDM: higher DPS → higher fair value', () => {
  // Both DPS values chosen so raw values stay inside the clamp corridor.
  const low = computeFairValue({ dps: 4.0, currentPrice: 25, low52: 15, high52: 35, sector: 'General', usdEgpRate: 48.0 });
  const high = computeFairValue({ dps: 8.0, currentPrice: 25, low52: 15, high52: 35, sector: 'General', usdEgpRate: 48.0 });
  assert.ok(high.fairValue > low.fairValue);
});

// ─── Fibonacci fallback ─────────────────────────────────────────────────────
console.log('\n📉 Fibonacci Structural Fallback');

test('Fallback: no fundamentals → LOW confidence Fibonacci estimate', () => {
  const { fairValue, confidence } = computeFairValue({
    currentPrice: 40,
    low52: 25,
    high52: 60,
    volRatio: 1.0,
    recommendScore: 0,
    sector: 'General',
    usdEgpRate: 48.0,
  });
  assert.strictEqual(confidence, 'LOW');
  const rangeMidpoint = 25 + 0.618 * (60 - 25); // 46.63
  const expected = rangeMidpoint * (0.85 + 0.15 * 1.0) * 1.0 * getCbeMacroDiscountFactor(0.2725) * 1.0;
  approx(fairValue, expected, 0.05);
});

test('Fallback: positive recommendScore applies floor', () => {
  const neutral = computeFairValue({
    currentPrice: 40, low52: 25, high52: 60, volRatio: 1.0,
    recommendScore: 0, sector: 'General', usdEgpRate: 48.0,
  });
  const bullish = computeFairValue({
    currentPrice: 40, low52: 25, high52: 60, volRatio: 1.0,
    recommendScore: 1, sector: 'General', usdEgpRate: 48.0,
  });
  assert.ok(bullish.fairValue >= neutral.fairValue);
});

// ─── Safety guardrails & edge cases ─────────────────────────────────────────
console.log('\n🛡️  Safety Guardrails & Edge Cases');

test('Clamp: fair value ≤ 2.00 × currentPrice', () => {
  // Very high EPS would produce raw FV far above 2× price
  const result = computeFairValue({
    eps: 100.0, currentPrice: 10, low52: 5, high52: 15,
    sector: 'Pharmaceuticals', usdEgpRate: 48.0,
  });
  assert.ok(result.fairValue <= 10 * 2.00 + 0.01, `fairValue ${result.fairValue} ≤ 20`);
});

test('Clamp: fair value ≥ 0.75 × currentPrice', () => {
  // Very low EPS would produce raw FV far below 0.75× price
  const result = computeFairValue({
    eps: 0.01, currentPrice: 100, low52: 50, high52: 150,
    sector: 'General', usdEgpRate: 48.0,
  });
  assert.ok(result.fairValue >= 100 * 0.75 - 0.01, `fairValue ${result.fairValue} ≥ 75`);
});

test('Edge: zero currentPrice throws error', () => {
  assert.throws(() => computeFairValue({
    currentPrice: 0, low52: 10, high52: 20, sector: 'General',
  }), /currentPrice/);
});

test('Edge: negative currentPrice throws error', () => {
  assert.throws(() => computeFairValue({
    currentPrice: -5, low52: 10, high52: 20, sector: 'General',
  }), /currentPrice/);
});

test('Edge: NaN currentPrice throws error', () => {
  assert.throws(() => computeFairValue({
    currentPrice: NaN, low52: 10, high52: 20, sector: 'General',
  }), /currentPrice/);
});

test('Edge: inverted 52-week bounds are swapped', () => {
  const result = computeFairValue({
    currentPrice: 50, low52: 80, high52: 20, // inverted!
    sector: 'General', usdEgpRate: 48.0,
  });
  assert.ok(result.fairValue > 0);
  // After swap: low=20, high=80 → midpoint = 20 + 0.618*60 = 57.08
  const expected = 57.08 * (0.85 + 0.15 * 1.0) * getCbeMacroDiscountFactor(0.2725);
  approx(result.fairValue, expected, 1.0);
});

test('Edge: missing low52/high52 use current-price corridor', () => {
  const result = computeFairValue({
    currentPrice: 50, sector: 'General', usdEgpRate: 48.0,
  });
  assert.ok(result.fairValue > 0);
});

test('Edge: NaN fundamentals treated as unavailable (routing preserved)', () => {
  const result = computeFairValue({
    eps: NaN, bvps: NaN, dps: NaN,
    currentPrice: 50, low52: 30, high52: 70,
    sector: 'General', usdEgpRate: 48.0,
  });
  assert.strictEqual(result.confidence, 'LOW'); // Fibonacci fallback
});

test('Edge: Infinity recommendation score clamped to 1', () => {
  const result = computeFairValue({
    currentPrice: 50, low52: 30, high52: 70,
    recommendScore: Infinity, sector: 'General', usdEgpRate: 48.0,
  });
  assert.ok(result.fairValue > 0);
});

test('Edge: negative volRatio clamped to 0', () => {
  const result = computeFairValue({
    currentPrice: 50, low52: 30, high52: 70, volRatio: -5,
    sector: 'General', usdEgpRate: 48.0,
  });
  assert.ok(result.fairValue > 0);
});

test('Edge: missing params object values default safely', () => {
  const result = computeFairValue({
    currentPrice: 50,
  });
  assert.ok(result.fairValue > 0);
});

test('Edge: very high 52w range still within guardrails on fallback', () => {
  const result = computeFairValue({
    currentPrice: 10, low52: 1, high52: 500,
    sector: 'General', usdEgpRate: 48.0,
  });
  assert.ok(result.fairValue >= 7.5 && result.fairValue <= 20.0, `fairValue ${result.fairValue} in [7.5, 20]`);
});

// ─── Real-world style scenarios ─────────────────────────────────────────────
console.log('\n🌍 Real-World-Style Scenarios');

test('Scenario: COMI bank with audited EPS & BVPS', () => {
  const result = computeFairValue({
    eps: 8.5, bvps: 45.0, dps: 3.0,
    currentPrice: 85, low52: 55, high52: 110,
    recommendScore: 0.6, sector: 'Banking', usdEgpRate: 49.5,
    epsConfidence: 'HIGH', symbol: 'COMI', name: 'Commercial International Bank',
  });
  assert.strictEqual(result.confidence, 'HIGH');
  assert.ok(result.fairValue >= 85 * 0.75 && result.fairValue <= 85 * 2.0);
});

test('Scenario: EGREF fund relies on PB', () => {
  const result = computeFairValue({
    eps: 0.5, bvps: 12.0, dps: 0.75,
    currentPrice: 9, low52: 6, high52: 14,
    recommendScore: 0.2, sector: 'Investment Fund', usdEgpRate: 49.5,
    epsConfidence: 'MEDIUM', symbol: 'EGREF', name: 'Egyptian Real Estate Fund',
  });
  assert.ok(result.fairValue >= 9 * 0.75 && result.fairValue <= 9 * 2.0);
});

test('Scenario: TMGH real estate high confidence', () => {
  const result = computeFairValue({
    eps: 1.2, bvps: 18.0, dps: 0.4,
    currentPrice: 32, low52: 18, high52: 45,
    recommendScore: 0.8, sector: 'Real Estate', usdEgpRate: 49.5,
    epsConfidence: 'HIGH', symbol: 'TMGH', name: 'Talaat Moustafa Group Real Estate',
  });
  assert.strictEqual(result.confidence, 'HIGH');
  assert.ok(result.fairValue >= 32 * 0.75 && result.fairValue <= 32 * 2.0);
});

test('Scenario: loss-making stock with no positive fundamentals falls back to Fibonacci', () => {
  const result = computeFairValue({
    eps: -0.5, bvps: -2.0, dps: 0,
    currentPrice: 15, low52: 8, high52: 22,
    sector: 'Textiles & Consumer Goods', usdEgpRate: 49.5,
  });
  assert.strictEqual(result.confidence, 'LOW');
  assert.ok(result.fairValue >= 15 * 0.75 && result.fairValue <= 15 * 2.0);
});

test('Scenario: petroleum stock inferred as Oil & Gas via sector input', () => {
  // When sector is explicitly provided as Oil & Gas, PE multiplier is 10.0
  const { fairValue } = computeFairValue({
    eps: 4.0, currentPrice: 30, low52: 15, high52: 45,
    sector: 'Oil & Gas', usdEgpRate: 49.5,
  });
  // EPS × 10 × growth(1) × macro(0.878) × fxAdj(1 + 0.25×0.03125 = 1.0078)
  const fxAdj = 1 + 0.25 * ((49.5 - 48) / 48);
  approx(fairValue, 4.0 * 10.0 * getCbeMacroDiscountFactor(0.2725) * fxAdj, 0.10);
});

test('Scenario: SWDY industrial cables use its sector multipliers', () => {
  const result = computeFairValue({
    eps: 3.0, bvps: 22.0,
    currentPrice: 28, low52: 15, high52: 40,
    sector: 'Industrial Cables & Energy', usdEgpRate: 49.5,
  });
  assert.ok(result.fairValue >= 28 * 0.75 && result.fairValue <= 28 * 2.0);
});

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(50)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`${'='.repeat(50)}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 All fair value engine tests passed!');
}