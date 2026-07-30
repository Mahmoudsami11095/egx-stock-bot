import { StateManager } from '../services/stateManager';
import { ShariaService } from '../services/shariaService';

async function testSync() {
  const stateManager = new StateManager();
  const shariaService = new ShariaService();

  console.log('🔍 Testing live Sharia sync & pruning from stocks.templatesnippet.com ...');

  const { added, removed } = await shariaService.syncHalalWatchlist(stateManager);

  console.log(`\n✅ Added ${added} new Halal EGX stocks.`);
  console.log(`⚠️ Removed ${removed.length} Non-Halal stocks:`, removed);

  const updatedWatchlist = stateManager.getWatchlist();
  console.log(`\n📊 Total Watchlist Size: ${updatedWatchlist.length} stocks.`);
  console.log('Is SUGR in watchlist?', updatedWatchlist.some(s => s.symbol === 'SUGR'));
}

testSync();
