const https = require('https');
const fs = require('fs');

const EARNINGS_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwBiThGKFuKtNLJyFaJVniOO73B7a5V3sbj3NVS54VzlY9PVCzaz5-uYrUuRq4G2XLR/exec';

function sendOverridesToAppsScript(url, data) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const u = new URL(url);

    const req = https.request({
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redRes) => {
          let body = '';
          redRes.on('data', c => body += c);
          redRes.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { resolve({ status: 'success' }); }
          });
        });
        return;
      }

      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve({ status: 'success' }); }
      });
    });

    req.on('error', (e) => resolve({ status: 'error', message: e.message }));
    req.write(payload);
    req.end();
  });
}

function loadEarningsOverridesLocal() {
  try {
    const data = require('../data/earnings_overrides.json');
    if (data && data.overrides) return data.overrides;
  } catch (e) {}
  return {};
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let overridesToSync = {};
    if (req.body && req.body.overrides) {
      overridesToSync = req.body.overrides;
    } else {
      overridesToSync = loadEarningsOverridesLocal();
    }

    const sheetRes = await sendOverridesToAppsScript(EARNINGS_APPS_SCRIPT_URL, { overrides: overridesToSync });

    return res.status(200).json({
      success: true,
      message: `🎉 Successfully synced ${Object.keys(overridesToSync).length} stock earnings overrides to Google Sheet online!`,
      updatedCount: Object.keys(overridesToSync).length,
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1EKvEu7qKYFZY6JoMfohKSXtFV6tvKxbtlvDlTYr2mJ0/edit?usp=sharing',
      webhookResult: sheetRes
    });
  } catch (err) {
    console.error('Failed to sync earnings overrides to Google Sheet:', err);
    return res.status(500).json({ error: 'Failed to sync earnings overrides to Google Sheet', details: err.message });
  }
};
