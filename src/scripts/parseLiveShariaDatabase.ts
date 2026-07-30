import https from 'https';

interface ShariaSourceCompliance {
  status?: string; // 'compliant' | 'non_compliant' | 'mixed'
  overall_status?: string;
  source_name?: string;
  percentage?: number;
}

interface LiveShariaStock {
  symbol: string;
  name_ar: string;
  name_en: string;
  sector?: string;
  status?: string; // 'compliant' | 'non_compliant' | 'mixed'
  overall_status?: string;
  compliance?: {
    overall_status?: string;
    musaffa?: ShariaSourceCompliance;
    halal_bourse?: ShariaSourceCompliance;
    kashif?: ShariaSourceCompliance;
    faisal_bank?: ShariaSourceCompliance;
    halal_invest?: ShariaSourceCompliance;
  };
  sources?: Record<string, any>;
}

function fetchLiveShariaDatabase() {
  console.log('🔍 Fetching live database from https://stocks.templatesnippet.com/data/stocks.json ...');

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

        const halalStocks: any[] = [];
        const nonHalalStocks: any[] = [];

        for (const item of stocks) {
          const symbol = item.symbol;
          const nameAr = item.name_ar || item.name_en || symbol;
          
          // Check compliance status properties in item
          const status = item.overall_status || item.status || item.compliance?.overall_status || item.compliance_status;
          
          console.log(`Symbol: ${symbol} | Name: ${nameAr} | Status: ${status || 'UNKNOWN'}`);
          console.log('Item Keys:', Object.keys(item));
          console.log('Full Item Sample:\n', JSON.stringify(item, null, 2).substring(0, 500));
          break; // Sample first item
        }
      } catch (err) {
        console.error('Error parsing stocks.json:', err);
      }
    });
  });

  req.end();
}

fetchLiveShariaDatabase();
