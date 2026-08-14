const http = require('http');

function fetchFromAzureVM(reqPath) {
  return new Promise((resolve) => {
    let completed = false;
    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        try { req.destroy(); } catch (e) {}
        resolve(null);
      }
    }, 2500);

    const req = http.get(`http://20.91.240.54:5000${reqPath}`, (res) => {
      if (res.statusCode !== 200) {
        if (!completed) { completed = true; clearTimeout(timer); resolve(null); }
        return;
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
        }
      });
    });

    req.on('error', () => {
      if (!completed) { completed = true; clearTimeout(timer); resolve(null); }
    });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'X-Served-By, X-Data-Timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const source = (req.query && req.query.source) || 'tradingview';
    const azureData = await fetchFromAzureVM(`/api/stocks?source=${source}`);
    if (azureData && Array.isArray(azureData) && azureData.length > 0) {
      res.setHeader('X-Served-By', 'Azure-VM-Primary');
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
      return res.status(200).json(azureData);
    }
  } catch (err) {
    console.error('Azure proxy error:', err);
  }

  return res.status(200).json([]);
};