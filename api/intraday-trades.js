const fs = require('fs');
const path = require('path');
const http = require('http');

function fetchFromAzureVM(reqPath) {
  return new Promise((resolve) => {
    const req = http.get(`http://20.91.240.54:5000${reqPath}`, { timeout: 3500 }, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function loadIntradayTradesLocal() {
  try {
    const data = require('../data/intraday_trades.json');
    if (data && Array.isArray(data)) return data;
  } catch (e) {}

  try {
    const data = require('./data/intraday_trades.json');
    if (data && Array.isArray(data)) return data;
  } catch (e) {}

  try {
    const data = require('../../data/intraday_trades.json');
    if (data && Array.isArray(data)) return data;
  } catch (e) {}

  const locations = [
    path.join(__dirname, '..', 'data', 'intraday_trades.json'),
    path.join(__dirname, 'data', 'intraday_trades.json'),
    path.join(process.cwd(), 'data', 'intraday_trades.json'),
    path.join(process.cwd(), 'frontend', 'data', 'intraday_trades.json')
  ];
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      try {
        const raw = fs.readFileSync(loc, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
  }
  return [];
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Try to fetch live runtime trades from Azure primary persistent VM first
  try {
    const azureData = await fetchFromAzureVM('/api/intraday-trades');
    if (azureData && azureData.success) {
      res.setHeader('X-Served-By', 'Azure-VM-Primary');
      return res.status(200).json(azureData);
    }
  } catch (err) {
    console.warn('Azure VM proxy failed for intraday trades, falling back to local bundle:', err.message);
  }

  // 2. Fallback to statically bundled local trades if Azure VM is down or unreachable
  try {
    const trades = loadIntradayTradesLocal();
    const openTrades = trades.filter(t => t.status === 'OPEN');
    const closedTrades = trades.filter(t => t.status !== 'OPEN');
    
    res.setHeader('X-Served-By', 'Vercel-LocalBundle');
    return res.status(200).json({
      success: true,
      open: openTrades,
      closed: closedTrades
    });
  } catch (err) {
    console.error('Error loading local bundled intraday trades:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
