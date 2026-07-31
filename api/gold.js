module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    goldUsdPerOz: 4111.10,
    usdEgpRate: 51.07,
    gold24kEgp: 6828,
    gold21kEgp: 5975,
    gold18kEgp: 5121,
    goldCoinEgp: 47800,
    signalType: 'BUY',
    rsi: 58.4
  });
};
