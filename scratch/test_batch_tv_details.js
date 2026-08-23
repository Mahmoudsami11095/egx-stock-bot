const https = require('https');

function parseTvPeriod(periodStr) {
  if (!periodStr) return { factor: 1, label: 'سنوي كامل' };
  const yr = periodStr.split('-')[0] || '';
  if (periodStr.includes('Q1')) return { factor: 4, label: `الربع الأول ${yr} (معدل سنوياً)` };
  if (periodStr.includes('Q2') || periodStr.includes('H1')) return { factor: 2, label: `النصف الأول ${yr} (معدل سنوياً)` };
  if (periodStr.includes('Q3') || periodStr.includes('9M')) return { factor: 1.3333, label: `9 أشهر ${yr} (معدل سنوياً)` };
  if (periodStr.includes('Q4')) return { factor: 1, label: `الربع الرابع ${yr} (معدل سنوياً)` };
  return { factor: 1, label: `سنوي كامل ${yr}`.trim() };
}

function fetchTvSymbolFinancials(sym) {
  return new Promise((resolve) => {
    const url = `https://www.tradingview.com/symbols/EGX-${sym}/financials-overview/`;
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 4000
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        const regex = /<script type="application\/prs\.init-data\+json">([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = regex.exec(b)) !== null) {
          try {
            const d = JSON.parse(match[1]);
            for (const k of Object.keys(d)) {
              if (d[k]?.descriptions?.['Income statements']) {
                const inc = d[k].descriptions['Income statements'].data;
                if (inc && inc.netIncome !== null && inc.netIncome !== undefined) {
                  const pInfo = parseTvPeriod(inc.fiscalPeriod);
                  const annualized = Number((inc.netIncome * pInfo.factor).toFixed(2));
                  return resolve({
                    sym,
                    rawNetIncome: inc.netIncome,
                    netIncome: annualized,
                    netIncomePeriod: pInfo.label,
                    totalRevenue: inc.totalRevenue ? Number((inc.totalRevenue * pInfo.factor).toFixed(2)) : undefined,
                    fiscalPeriod: inc.fiscalPeriod
                  });
                }
              }
            }
          } catch (e) {}
        }
        resolve(null);
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  const symbols = ['AMOC', 'COPR', 'HRHO', 'ORAS', 'TMGH', 'EKHO', 'SWDY', 'ETEL'];
  for (const s of symbols) {
    const res = await fetchTvSymbolFinancials(s);
    console.log(s, '->', res);
  }
}

run();
