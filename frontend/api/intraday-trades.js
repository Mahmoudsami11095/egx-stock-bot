const fs = require('fs');
const path = require('path');

function loadIntradayTradesLocal() {
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

  try {
    const trades = loadIntradayTradesLocal();
    const openTrades = trades.filter(t => t.status === 'OPEN');
    const closedTrades = trades.filter(t => t.status !== 'OPEN');
    
    return res.status(200).json({
      success: true,
      open: openTrades,
      closed: closedTrades
    });
  } catch (err) {
    console.error('Error loading intraday trades:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
