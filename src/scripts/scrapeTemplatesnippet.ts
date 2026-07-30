import https from 'https';

function scrapeShariaWebsite() {
  console.log('🔍 Fetching live Sharia stock database from https://stocks.templatesnippet.com/stocks ...');

  const options = {
    hostname: 'stocks.templatesnippet.com',
    port: 443,
    path: '/stocks',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
    }
  };

  const req = https.request(options, (res) => {
    let html = '';
    res.on('data', (chunk) => (html += chunk));
    res.on('end', () => {
      console.log(`Received HTML (${html.length} bytes). Searching for Next.js data script...`);

      // Search for __NEXT_DATA__
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
      if (match && match[1]) {
        try {
          const json = JSON.parse(match[1]);
          console.log('✅ Found __NEXT_DATA__ JSON!');
          console.log(JSON.stringify(json.props?.pageProps || {}, null, 2).substring(0, 1000));
        } catch (e) {
          console.error('JSON parse error:', e);
        }
      } else {
        console.log('Searching for embedded stock array in HTML / JS scripts...');
        // Look for JSON stringified arrays or Next.js f push scripts
        const regex = /"symbol":"([A-Z0-9]+)"/g;
        let symMatch;
        const symbols = new Set<string>();
        while ((symMatch = regex.exec(html)) !== null) {
          symbols.add(symMatch[1]);
        }
        console.log(`Found ${symbols.size} stock symbols in HTML:`, Array.from(symbols));
      }
    });
  });

  req.on('error', (err) => console.error('Fetch error:', err));
  req.end();
}

scrapeShariaWebsite();
