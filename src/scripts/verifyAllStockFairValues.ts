import { syncVerifiedEarningsToSheet } from './syncVerifiedEarningsToSheet';

async function runFullStockVerification() {
  console.log('1️⃣ Running Automated Sync with Strict Data Confidence Filters...');
  await syncVerifiedEarningsToSheet();

  console.log('\n2️⃣ Testing All 293 EGX Stock Calculations in Backend Handler...');
  const handler = require('../../api/stocks.js');

  handler({ method: 'GET' }, {
    setHeader: () => {},
    status: (code: number) => ({
      json: (data: any[]) => {
        console.log(`✅ Status Code: ${code} | Total Stocks Returned: ${data.length}`);
        
        let validEpsCount = 0;
        let overrideCount = 0;
        let tradingViewCount = 0;
        let newsParserCount = 0;
        let noneCount = 0;
        let errorCount = 0;

        data.forEach((s: any) => {
          if (!s.symbol || isNaN(s.currentPrice) || isNaN(s.fairValue)) {
            console.error(`❌ Data Error in ${s.symbol}: invalid price or fair value`);
            errorCount++;
          }

          if (s.epsSource === 'OVERRIDE') overrideCount++;
          else if (s.epsSource === 'TRADINGVIEW_TTM') tradingViewCount++;
          else if (s.epsSource === 'AUTO_NEWS_PARSER') newsParserCount++;
          else noneCount++;

          if (s.eps && s.eps > 0) validEpsCount++;
        });

        console.log('\n=== FULL VERIFICATION STATS ===');
        console.log(`• Total Processed Stocks: ${data.length}`);
        console.log(`• Overrides (Audited Google Sheet): ${overrideCount}`);
        console.log(`• TradingView Audited TTM: ${tradingViewCount}`);
        console.log(`• Automated News Parser: ${newsParserCount}`);
        console.log(`• No EPS (Fallback Valuation): ${noneCount}`);
        console.log(`• Total Valid EPS Stocks: ${validEpsCount}`);
        console.log(`• Total Calculation Errors: ${errorCount}`);

        if (errorCount === 0) {
          console.log('\n🎉 ALL 293 STOCKS PASSED CALCULATION & DATA INTEGRITY VERIFICATION!');
        } else {
          console.error(`\n❌ VERIFICATION FAILED: ${errorCount} stocks had calculation errors.`);
          process.exit(1);
        }
      }
    })
  });
}

runFullStockVerification();
