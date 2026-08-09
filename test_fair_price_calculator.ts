/**
 * Unit tests for the generic fair value calculator (shared/fairPriceCalculator.ts).
 *
 * Run with: npx ts-node test_fair_price_calculator.ts
 */

import {
  calculateFairPrice,
  rankByUpside,
  FairValueResult,
} from './shared/fairPriceCalculator';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err: any) {
    failed++;
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
  }
}

function approx(actual: number, expected: number, tolerance = 0.01) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`expected ${actual} to be within ${tolerance} of ${expected}`);
  }
}

const fullData = {
  current_price: 100,
  currency: 'USD',
  as_of_date: '2026-08-09',
  eps_trailing: 5.0,
  eps_trailing_period: 'annual' as const,
  eps_forward: 6.0,
  eps_forward_period: 'annual' as const,
  book_value_per_share: 40.0,
  analyst_target_mean: 120,
  analyst_target_low: 110,
  analyst_target_high: 135,
  sector_avg_pe: 15.0,
  sector_avg_pb: 2.5,
  net_income_growth_yoy: 10.0,
  free_cash_flow: 500_000_000,
  shares_outstanding: 50_000_000,
  wacc: 11.0,
  terminal_growth_rate: 3.0,
};

// ─── Full data available (all methods run) ─────────────────────────────────
console.log('\n📈 Full Data Available');

test('all 5 methods run with full data', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', fullData);
  // analyst, pe, pb, eps_intrinsic, dcf all present
  const expected = ['analyst', 'pe', 'pb', 'eps_intrinsic', 'dcf'].sort();
  const actual = [...r.methods_used].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected methods ${expected.join(',')} got ${actual.join(',')}`);
  }
  if (r.methods_skipped && Object.keys(r.methods_skipped).length > 0) {
    throw new Error(`no methods should be skipped with full data, got ${JSON.stringify(r.methods_skipped)}`);
  }
  // Equal-weight blend across 5 methods
  const analystMid = 120;
  const peMid = 6.0 * 15.0; // 90
  const pbMid = 40.0 * 2.5; // 100
  const epsIntrinsicMid = 6.0 * 15.0 * 1.10; // 99
  const fcfPerShare = 500_000_000 / 50_000_000; // 10
  const dcfMid = (10 * 1.03) / (0.11 - 0.03); // 128.75
  const expectedMid = (analystMid + peMid + pbMid + epsIntrinsicMid + dcfMid) / 5;
  approx(r.fair_price_mid, expectedMid, 0.10);
  approx(r.upside_downside_pct, ((expectedMid - 100) / 100) * 100, 0.10);
  if (r.data_quality_flags.length > 0) {
    throw new Error(`no quality flags expected with full data, got ${r.data_quality_flags.join('; ')}`);
  }
});

test('weights exposed in output', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', fullData);
  const total = Object.values(r.method_weights).reduce((a, b) => a + b, 0);
  approx(total, 1.0, 0.001);
});

test('custom weights override equal weight', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', fullData, [], { analyst: 2, pe: 1, pb: 1, eps_intrinsic: 1, dcf: 1 });
  approx(r.method_weights.analyst!, 2 / 6, 0.001);
  approx(r.method_weights.pe!, 1 / 6, 0.001);
});

// ─── Partial data (method exclusion) ───────────────────────────────────────
console.log('\n📉 Partial Data (Method Exclusion)');

test('no analyst targets → analyst method skipped', () => {
  const r = calculateFairPrice('TEST', 'EGX', {
    ...fullData,
    analyst_target_mean: undefined,
    analyst_target_low: undefined,
    analyst_target_high: undefined,
  });
  if (r.methods_used.includes('analyst')) throw new Error('analyst should be skipped');
  if (!r.methods_skipped.analyst) throw new Error('analyst skip reason missing');
  if (!r.methods_skipped.analyst.includes('analyst_target_mean')) {
    throw new Error('skip reason should mention missing field');
  }
});

test('no sector_avg_pe → PE falls back to peer median P/E', () => {
  const r = calculateFairPrice(
    'TEST', 'EGX',
    { ...fullData, sector_avg_pe: undefined },
    [
      { ticker: 'A', pe: 10 },
      { ticker: 'B', pe: 14 },
      { ticker: 'C', pe: 16 },
    ]
  );
  // peer median = 14
  const peMid = 6.0 * 14.0; // 84
  const epsIntrinsicMid = 6.0 * 14.0 * 1.10; // 92.4
  // analyst=120, pb=100, dcf=128.75
  const expectedMid = (120 + 84 + 100 + 92.4 + 128.75) / 5;
  approx(r.fair_price_mid, expectedMid, 0.10);
});

test('no sector_avg_pe and no peers → PE & eps_intrinsic skipped', () => {
  const r = calculateFairPrice('TEST', 'EGX', { ...fullData, sector_avg_pe: undefined, sector_avg_pb: undefined });
  if (r.methods_used.includes('pe')) throw new Error('pe should be skipped');
  if (r.methods_used.includes('eps_intrinsic')) throw new Error('eps_intrinsic should be skipped');
  if (!r.methods_skipped.pe) throw new Error('pe skip reason missing');
  if (!r.methods_skipped.eps_intrinsic) throw new Error('eps_intrinsic skip reason missing');
});

test('no EPS → PE & eps_intrinsic skipped', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', {
    ...fullData,
    eps_trailing: undefined,
    eps_forward: undefined,
  });
  if (r.methods_used.includes('pe')) throw new Error('pe should be skipped without EPS');
  if (r.methods_used.includes('eps_intrinsic')) throw new Error('eps_intrinsic should be skipped without EPS');
});

// ─── Cumulative vs. quarterly EPS detection ────────────────────────────────
console.log('\n⏱️  Cumulative vs. Quarterly EPS Detection');

test('cumulative forward EPS is rejected with quality flag', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', {
    ...fullData,
    eps_forward: 3.0, // would be wrong if multiplied by 15x silently (45 vs 90)
    eps_forward_period: 'ytd',
  });
  const hasFlag = r.data_quality_flags.some((f) => f.includes('eps_forward') && f.includes('ytd'));
  if (!hasFlag) throw new Error('expected cumulative-flag for eps_forward ytd');
  // Falls back to trailing annual EPS (5.0)
  const peMid = 5.0 * 15.0; // 75
  if (r.methods_used.includes('pe')) {
    // Verify PE used trailing 5.0 not cumulative 3.0
    const expectedMid = (120 + 75 + 100 + 75 * 1.10 + 128.75) / 5;
    approx(r.fair_price_mid, expectedMid, 0.10);
  }
});

test('both EPses cumulative → PE & eps_intrinsic skipped, flag raised', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', {
    ...fullData,
    eps_trailing: 2.0,
    eps_trailing_period: 'h1',
    eps_forward: 3.0,
    eps_forward_period: 'nine_months',
  });
  if (r.methods_used.includes('pe')) throw new Error('pe should be skipped with only cumulative EPS');
  if (r.methods_used.includes('eps_intrinsic')) throw new Error('eps_intrinsic should be skipped');
  const hasFlag = r.data_quality_flags.some((f) => f.includes('h1') || f.includes('nine_months'));
  if (!hasFlag) throw new Error('expected cumulative-period quality flag');
});

// ─── Zero/negative values (no divide-by-zero) ─────────────────────────────
console.log('\n🚫 Zero & Negative Values');

test('zero/negative EPS treated as unavailable (no divide-by-zero)', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', {
    ...fullData,
    eps_trailing: -2.0,
    eps_forward: 0,
  });
  if (r.methods_used.includes('pe')) throw new Error('pe should be skipped with zero/neg EPS');
  if (r.methods_used.includes('eps_intrinsic')) throw new Error('eps_intrinsic should be skipped');
});

test('zero book_value_per_share → PB skipped', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', { ...fullData, book_value_per_share: 0 });
  if (r.methods_used.includes('pb')) throw new Error('pb should be skipped with zero BVPS');
});

test('zero free_cash_flow → DCF skipped', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', { ...fullData, free_cash_flow: 0 });
  if (r.methods_used.includes('dcf')) throw new Error('dcf should be skipped with zero FCF');
});

test('wacc <= terminal_growth → DCF skipped', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', {
    ...fullData,
    wacc: 2.0,
    terminal_growth_rate: 5.0,
  });
  if (r.methods_used.includes('dcf')) throw new Error('dcf should be skipped when wacc <= g');
});

test('negative current_price throws error', () => {
  let threw = false;
  try {
    calculateFairPrice('TEST', 'NASDAQ', { ...fullData, current_price: -5 });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('expected error for negative current_price');
});

test('missing as_of_date throws error', () => {
  let threw = false;
  try {
    calculateFairPrice('TEST', 'NASDAQ', { ...fullData, as_of_date: '' });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('expected error for empty as_of_date');
});

// ─── Insufficient data flag ────────────────────────────────────────────────
console.log('\n⚠️  Insufficient Data Flag');

test('single method → "insufficient data for reliable fair value" flag', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', {
    current_price: 100,
    currency: 'USD',
    as_of_date: '2026-08-09',
    analyst_target_mean: 120,
  });
  if (r.methods_used.length !== 1) {
    throw new Error(`expected exactly 1 method used, got ${r.methods_used.length}`);
  }
  if (!r.data_quality_flags.includes('insufficient data for reliable fair value')) {
    throw new Error('expected insufficient-data flag');
  }
});

test('no valid methods → empty result with flag', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', {
    current_price: 100,
    currency: 'USD',
    as_of_date: '2026-08-09',
  });
  if (r.methods_used.length !== 0) {
    throw new Error(`expected 0 methods used, got ${r.methods_used.length}`);
  }
  if (!r.data_quality_flags.includes('insufficient data for reliable fair value')) {
    throw new Error('expected insufficient-data flag');
  }
  if (r.fair_price_mid !== 0) throw new Error('fair_price_mid should be 0 with no methods');
});

// ─── Currency in output ────────────────────────────────────────────────────
console.log('\n💱 Currency Preservation');

test('output carries source currency (no implicit conversion)', () => {
  const r = calculateFairPrice('TEST', 'NASDAQ', { ...fullData, currency: 'EGP' });
  if (r.currency !== 'EGP') throw new Error(`expected EGP, got ${r.currency}`);
});

// ─── Batch sort ────────────────────────────────────────────────────────────
console.log('\n📊 Batch Ranking by Upside');

test('rankByUpside sorts descending by upside', () => {
  const results: FairValueResult[] = [
    calculateFairPrice('A', 'NASDAQ', { ...fullData, current_price: 100, analyst_target_mean: 110 }),
    calculateFairPrice('B', 'NASDAQ', { ...fullData, current_price: 100, analyst_target_mean: 150 }),
    calculateFairPrice('C', 'NASDAQ', { ...fullData, current_price: 100, analyst_target_mean: 90 }),
  ];
  const ranked = rankByUpside(results);
  const up = ranked.map((r) => r.upside_downside_pct);
  for (let i = 1; i < up.length; i++) {
    if (up[i] > up[i - 1]) {
      throw new Error(`not sorted descending: ${up.join(',')}`);
    }
  }
  if (ranked[0].ticker !== 'B') throw new Error('highest upside should be B first');
});

test('batch results are deterministic', () => {
  const a = calculateFairPrice('TEST', 'NASDAQ', fullData);
  const b = calculateFairPrice('TEST', 'NASDAQ', fullData);
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error('identical inputs should produce identical outputs');
  }
});

// ─── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(50)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`${'='.repeat(50)}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 All fair price calculator tests passed!');
}