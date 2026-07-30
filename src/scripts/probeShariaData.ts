import https from 'https';

async function fetchUrl(path: string): Promise<string> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'stocks.templatesnippet.com',
      port: 443,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(''));
    req.end();
  });
}

async function probe() {
  const paths = [
    '/_next/static/chunks/app/stocks/page-eadf8b0417096159.js',
    '/_next/static/chunks/328.js',
    '/_next/static/chunks/app/stocks/page.js',
    '/data/stocks.json',
    '/stocks.json',
    '/api/stocks'
  ];

  for (const p of paths) {
    const res = await fetchUrl(p);
    console.log(`Path: ${p} | Length: ${res.length} | Contains "SUGR": ${res.includes('SUGR')}`);
    if (res.includes('SUGR')) {
      console.log(`FOUND SUGR in ${p}!`);
      // Find JSON object around SUGR
      const idx = res.indexOf('SUGR');
      console.log(res.substring(Math.max(0, idx - 200), Math.min(res.length, idx + 400)));
    }
  }
}

probe();
