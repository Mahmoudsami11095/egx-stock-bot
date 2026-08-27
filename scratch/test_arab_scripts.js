const https = require('https');

const url = 'https://www.tradingview.com/symbols/EGX-ARAB/financials-overview/';
https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  }
}, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    console.log('Total HTML length:', b.length);
    // Find all <script> tags
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let sMatch;
    let idx = 0;
    while ((sMatch = scriptRegex.exec(b)) !== null) {
      const content = sMatch[1];
      if (content.includes('630') || content.includes('Q1') || content.includes('Performance') || content.includes('growth') || content.includes('quarterly')) {
        console.log(`Script #${idx} matched keyword:`, content.slice(0, 500));
      }
      idx++;
    }
  });
});
