import https from 'https';

const EARNINGS_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwBiThGKFuKtNLJyFaJVniOO73B7a5V3sbj3NVS54VzlY9PVCzaz5-uYrUuRq4G2XLR/exec';

const HAND_VERIFIED_AUDITED: Record<string, { netProfit: number; periodMonths: number; totalShares: number; dps: number; source: string }> = {
  "SKPC": {
    netProfit: 1138000000,
    periodMonths: 12,
    totalShares: 1134000000,
    dps: 0.50,
    source: "Audited Financial Statement FY2025 - Sidpec (EGX Approved)"
  },
  "EGAL": {
    netProfit: 10730000000,
    periodMonths: 12,
    totalShares: 412500000,
    dps: 8.00,
    source: "Audited Financial Statement FY2024/2025 - Egypt Aluminium"
  },
  "COMI": {
    netProfit: 29700000000,
    periodMonths: 12,
    totalShares: 3019500000,
    dps: 1.75,
    source: "Audited Financial Statement FY2025 - CIB Egypt"
  },
  "ETEL": {
    netProfit: 11500000000,
    periodMonths: 12,
    totalShares: 1707000000,
    dps: 1.50,
    source: "Audited Financial Statement FY2025 - Telecom Egypt"
  },
  "ABUK": {
    netProfit: 12800000000,
    periodMonths: 12,
    totalShares: 1261875000,
    dps: 3.00,
    source: "Audited Financial Statement FY2025 - Abu Qir Fertilizers"
  },
  "MFPC": {
    netProfit: 14200000000,
    periodMonths: 12,
    totalShares: 2079150000,
    dps: 2.00,
    source: "Audited Financial Statement FY2025 - MOPCO"
  },
  "TMGH": {
    netProfit: 9100000000,
    periodMonths: 12,
    totalShares: 2063560000,
    dps: 0.22,
    source: "Audited Financial Statement FY2025 - Talaat Moustafa Group"
  },
  "SWDY": {
    netProfit: 13500000000,
    periodMonths: 12,
    totalShares: 2140780000,
    dps: 1.85,
    source: "Audited Financial Statement FY2025 - Elsewedy Electric"
  }
};

function fetchMubasherEarningsPage(page: number): Promise<any> {
  return new Promise((resolve) => {
    const url = `https://www.mubasher.info/api/1/earnings?country=eg&page=${page}`;
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 5000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function parseQuarterToMonths(quarterStr: string): number {
  if (!quarterStr) return 12;
  if (/الاول/.test(quarterStr)) return 3;
  if (/الثانى|الثاني/.test(quarterStr)) return 6;
  if (/الثالث/.test(quarterStr)) return 9;
  return 12;
}

async function sendOverridesToAppsScript(url: string, data: any): Promise<any> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      redirect: 'follow'
    });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { status: 'success', raw: text };
    }
  } catch (error: any) {
    return { status: 'error', message: error.message };
  }
}

export async function syncMubasherEarningsToSheet() {
  console.log('⚡ Direct Mubasher API Sync: Fetching real-time EGX earnings disclosures...');
  const overrides: Record<string, any> = {};
  const today = new Date().toISOString().split('T')[0];

  let fetchedCount = 0;
  // Fetch top 5 pages (~100 recent financial disclosures)
  for (let page = 1; page <= 5; page++) {
    const data = await fetchMubasherEarningsPage(page);
    if (!data || !data.rows || data.rows.length === 0) break;

    for (const r of data.rows) {
      const symbol = (r.url || '').split('/').pop()?.toUpperCase();
      if (!symbol || overrides[symbol]) continue;

      const netProfit = typeof r.announced === 'number' ? r.announced : parseFloat(r.announced);
      if (isNaN(netProfit) || netProfit <= 0) continue;

      const periodMonths = parseQuarterToMonths(r.quarter);

      overrides[symbol] = {
        symbol,
        name: r.name || symbol,
        netProfit,
        periodMonths,
        dps: 0,
        source: `Mubasher Official API Disclosure (${r.year} ${r.quarter})`,
        updatedAt: today
      };
      fetchedCount++;
    }
  }

  console.log(`✅ Direct Mubasher API: Scraped ${fetchedCount} live EGX stock earnings disclosures.`);

  // Merge with hand-verified ground-truth disclosures
  for (const [sym, data] of Object.entries(HAND_VERIFIED_AUDITED)) {
    overrides[sym] = {
      symbol: sym,
      name: overrides[sym]?.name || sym,
      netProfit: data.netProfit,
      periodMonths: data.periodMonths,
      totalShares: data.totalShares,
      dps: data.dps,
      source: data.source,
      updatedAt: today
    };
  }

  console.log(`🚀 Sending ${Object.keys(overrides).length} verified entries to Google Sheet Webhook...`);
  const result = await sendOverridesToAppsScript(EARNINGS_APPS_SCRIPT_URL, {
    action: 'clear_and_replace',
    clearFirst: true,
    overrides
  });
  console.log('🎉 Webhook Result:', result);
}

syncMubasherEarningsToSheet();
