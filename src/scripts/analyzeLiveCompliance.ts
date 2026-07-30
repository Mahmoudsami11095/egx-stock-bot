import https from 'https';

function analyzeLiveCompliance() {
  const options = {
    hostname: 'stocks.templatesnippet.com',
    port: 443,
    path: '/data/stocks.json',
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      try {
        const stocks: any[] = JSON.parse(body);
        console.log(`✅ Loaded ${stocks.length} stocks from live stocks.json database!\n`);

        const sugr = stocks.find((s) => s.symbol === 'SUGR');
        console.log('📌 SUGR Item Data:\n', JSON.stringify(sugr, null, 2));

        const halalStocks: { symbol: string; nameAr: string; loans: number; haram: number }[] = [];
        const nonHalalStocks: { symbol: string; nameAr: string; reason: string }[] = [];

        for (const item of stocks) {
          const symbol = item.symbol;
          const nameAr = item.name_ar || item.name_en || symbol;

          const isCoreCompliant = item.core_activity_compliant !== false;
          const loansPercent = item.loans_percentage ?? 0;
          const haramPercent = item.haram_earnings_percentage ?? item.sp_haram_earning_percentage ?? 0;

          // Standard AAOIFI & Sharia Rules:
          // 1. Core activity must be compliant (core_activity_compliant == true)
          // 2. Interest-bearing loans < 33%
          // 3. Haram revenue < 5%
          if (!isCoreCompliant) {
            nonHalalStocks.push({ symbol, nameAr, reason: 'Core Activity Non-Compliant' });
          } else if (loansPercent > 33) {
            nonHalalStocks.push({ symbol, nameAr, reason: `Loans Ratio High (${loansPercent}%)` });
          } else if (haramPercent > 5) {
            nonHalalStocks.push({ symbol, nameAr, reason: `Haram Revenue High (${haramPercent}%)` });
          } else {
            halalStocks.push({ symbol, nameAr, loans: loansPercent, haram: haramPercent });
          }
        }

        console.log(`\n🟢 Total Halal Compliant Stocks Discovered: ${halalStocks.length}`);
        console.log('Sample Halal Stocks:', halalStocks.map(s => `${s.symbol} (${s.nameAr})`).slice(0, 30));

        console.log(`\n🔴 Total Non-Compliant Stocks Filtered Out: ${nonHalalStocks.length}`);
        console.log('Sample Non-Halal Stocks:', nonHalalStocks.slice(0, 15));

      } catch (err) {
        console.error('Error analyzing live compliance:', err);
      }
    });
  });

  req.end();
}

analyzeLiveCompliance();
