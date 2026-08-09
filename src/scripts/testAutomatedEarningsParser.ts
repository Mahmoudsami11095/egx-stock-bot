import { parseArabicFinancialHeadline } from '../services/automatedEarningsParser';

interface TestCase {
  symbol: string;
  title: string;
  expectedNetProfit: number;
  expectedPeriodMonths?: number;
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    symbol: 'SKPC',
    title: '\u0623\u0631\u0628\u0627\u062d 1.138 \u0645\u0644\u064a\u0627\u0631 \u0645\u0642\u0627\u0628\u0644 2.539 \u0645\u0644\u064a\u0627\u0631 \u0641\u064a 2024',
    expectedNetProfit: 1_138_000_000,
    description: 'SKPC comparison headline - must extract 1.138B not 2.539B',
  },
  {
    symbol: 'EGAL',
    title: '\u0623\u0631\u0628\u0627\u062d \u0645\u0635\u0631 \u0644\u0644\u0623\u0644\u0648\u0645\u0646\u064a\u0648\u0645 \u062a\u0646\u0645\u0648 6% \u0625\u0644\u0649 10.4 \u0645\u0644\u064a\u0627\u0631 \u062c\u0646\u064a\u0647 \u062e\u0644\u0627\u0644 9 \u0623\u0634\u0647\u0631',
    expectedNetProfit: 10_400_000_000,
    expectedPeriodMonths: 9,
    description: 'Standard billion pattern with 9-month period',
  },
  {
    symbol: 'SWDY',
    title: '\u0623\u0631\u0628\u0627\u062d \u0627\u0644\u0633\u0648\u064a\u062f\u064a \u0625\u0644\u064a\u0643\u062a\u0631\u064a\u0643 \u062a\u0631\u062a\u0641\u0639 \u0625\u0644\u0649 3.5 \u0645\u0644\u064a\u0627\u0631 \u062c\u0646\u064a\u0647 \u0641\u064a \u0627\u0644\u0631\u0628\u0639 \u0627\u0644\u0623\u0648\u0644',
    expectedNetProfit: 3_500_000_000,
    expectedPeriodMonths: 3,
    description: 'Quarterly billion pattern',
  },
  {
    symbol: 'TAQA',
    title: '\u0635\u0627\u0641\u064a \u0623\u0631\u0628\u0627\u062d \u0637\u0627\u0642\u0629 \u0639\u0631\u0628\u064a\u0629 \u064a\u0635\u0644 \u0625\u0644\u0649 540 \u0645\u0644\u064a\u0648\u0646 \u062c\u0646\u064a\u0647 \u062e\u0644\u0627\u0644 6 \u0623\u0634\u0647\u0631',
    expectedNetProfit: 540_000_000,
    expectedPeriodMonths: 6,
    description: 'Million pattern with 6-month period',
  },
  {
    symbol: 'SKPC',
    title: '\u0633\u062c\u0644\u062a \u0635\u0627\u0641\u064a \u0623\u0631\u0628\u0627\u062d 1.138 \u0645\u0644\u064a\u0627\u0631 \u062c\u0646\u064a\u0647 \u0639\u0646 \u0639\u0627\u0645 2025 \u0645\u0642\u0627\u0628\u0644 2.539 \u0645\u0644\u064a\u0627\u0631 \u062c\u0646\u064a\u0647 \u0641\u064a 2024',
    expectedNetProfit: 1_138_000_000,
    expectedPeriodMonths: 12,
    description: 'Full SKPC disclosure sentence with year comparison',
  },
];

let passed = 0;
let failed = 0;

console.log('Automated Earnings Parser - Headline Tests\n');

for (const test of TEST_CASES) {
  const result = parseArabicFinancialHeadline(test.symbol, test.title, new Date().toISOString());
  const profitOk = result?.netProfit === test.expectedNetProfit;
  const periodOk = test.expectedPeriodMonths === undefined || result?.periodMonths === test.expectedPeriodMonths;
  const ok = profitOk && periodOk;

  if (ok) {
    passed++;
    console.log(`PASS: ${test.description}`);
    console.log(`  netProfit=${result!.netProfit.toLocaleString()} periodMonths=${result!.periodMonths}\n`);
  } else {
    failed++;
    console.log(`FAIL: ${test.description}`);
    console.log(`  Expected netProfit=${test.expectedNetProfit.toLocaleString()}`);
    console.log(`  Got      netProfit=${result?.netProfit?.toLocaleString() ?? 'null'} periodMonths=${result?.periodMonths ?? 'null'}\n`);
  }
}

console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
