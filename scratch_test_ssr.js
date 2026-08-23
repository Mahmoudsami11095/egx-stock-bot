const https = require('https');

https.get('https://stockastic.app/ar/company/MASR.EGX', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode, 'Body length:', body.length);
    if (body.includes('__NEXT_DATA__')) {
      console.log('Found __NEXT_DATA__!');
      const match = body.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (match) {
        try {
          const json = JSON.parse(match[1]);
          console.log('Next.js PageProps keys:', Object.keys(json.props?.pageProps || {}));
          console.log('Sample Data:', JSON.stringify(json.props?.pageProps, null, 2).slice(0, 500));
        } catch(e) {
          console.log('Parse err:', e.message);
        }
      }
    } else {
      console.log('Does not contain __NEXT_DATA__, searching for JSON scripts...');
      const matches = body.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g);
      console.log('JSON scripts found:', matches ? matches.length : 0);
      if (matches) {
        matches.forEach((m, idx) => console.log(`Script ${idx}:`, m.slice(0, 150)));
      }
    }
  });
}).on('error', err => console.log('Err:', err.message));
