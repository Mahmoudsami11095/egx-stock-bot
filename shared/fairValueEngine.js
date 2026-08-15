/**
 * Re-export from the canonical TypeScript engine (src/services/fairValueEngine.ts).
 * This preserves backward compatibility for CommonJS consumers and test_fair_value.js.
 */
let engine;
try {
  engine = require('../dist/services/fairValueEngine');
} catch (e) {
  try {
    require('ts-node/register');
    engine = require('../src/services/fairValueEngine');
  } catch (err) {
    throw e;
  }
}

module.exports = engine;