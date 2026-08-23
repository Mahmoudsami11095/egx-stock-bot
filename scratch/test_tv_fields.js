const https = require('https');

function testSymbol(sym) {
  const url = `https://www.tradingview.com/symbols/EGX-${sym}/financials-overview/`;
  https.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  }, res => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
      const regex = /<script type="application\/prs\.init-data\+json">([\s\S]*?)<\/script>/gi;
      let match;
      let found = false;
      while ((match = regex.exec(b)) !== null) {
        try {
          const d = JSON.parse(match[1]);
          for (const k of Object.keys(d)) {
            if (d[k]?.descriptions?.['Income statements']) {
              console.log(`${sym} TV Income Statements:`, d[k].descriptions['Income statements'].data);
              found = true;
            }
          }
        } catch(e) {}
      }
      if (!found) {
        console.log(`${sym} TV Income Statements: NOT FOUND (Status ${res.statusCode})`);
      }
    });
  });
}

testSymbol('AMOC');
testSymbol('COPR');
testSymbol('HRHO');
