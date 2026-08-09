import { IntradayTrackerService } from '../services/intradayTracker';
import { StockAnalysisResult } from '../types/stock';

async function runIntradayTrackerTest() {
  console.log('🧪 Starting Intraday Tracker validation tests...');

  // Initialize service
  const tracker = new IntradayTrackerService();
  
  // Clear any existing trades to ensure a clean state
  tracker.clearAllTrades();
  console.log('🧹 Cleaned existing trade database.');

  // Create a mock TelegramBotService
  const capturedMessages: string[] = [];
  const mockTelegramBot = {
    broadcastRawMessage: async (msg: string) => {
      capturedMessages.push(msg);
      // Log the first line of the Arabic message
      const firstLine = msg.trim().split('\n')[0];
      console.log(`📡 [Mock Telegram] Broadcasted: "${firstLine}"`);
    }
  } as any;

  // ----------------------------------------------------
  // TEST CASE 1: Open a new STRONG_BUY trade recommendation
  // ----------------------------------------------------
  console.log('\n--- 1. Simulating STRONG_BUY Signal ---');
  
  const mockAnalysisMPCI: StockAnalysisResult = {
    quote: {
      symbol: 'MPCI',
      yahooSymbol: 'MPCI.CA',
      nameEn: 'MPCI',
      nameAr: 'مصر للألومنيوم',
      currentPrice: 100.0,
      previousClose: 99.0,
      change: 1.0,
      changePercent: 1.01,
      dayHigh: 101.0,
      dayLow: 98.0,
      fiftyTwoWeekHigh: 120.0,
      fiftyTwoWeekLow: 60.0,
      volume: 15000,
      avgVolume: 10000
    },
    indicators: {
      rsi: 60,
      sma20: 98,
      sma50: 95,
      support: 95,
      resistance: 102,
      volumeSpike: true,
      volumeRatio: 2.0
    },
    signalType: 'BUY',
    signalScore: 1.2,
    reasons: ['Strong momentum'],
    fairValue: 130.0,
    fairValueConfidence: 'HIGH',
    fairValueUpsidePercent: 30.0,
    marketRegime: 'BULLISH',
    suggestedEntry: { min: 98.0, max: 102.0 },
    suggestedTarget: { target1: 105.0, target2: 110.0 },
    suggestedStopLoss: 95.0,
    positionSizePercent: 10,
    riskRewardRatio: 2.5,
    timestamp: new Date(),
    
    // Intraday fields
    intradaySignal: 'STRONG_BUY',
    intradayScore: 2.5,
    intradayReasons: ['اختراق مستويات مقاومة مع سيولة مرتفعة', 'RSI متصاعد وإيجابي'],
    intradayEntry: 100.0,
    intradayTarget: 106.0,
    intradayStopLoss: 97.0
  };

  // Run trackAndCheck to open MPCI trade
  await tracker.trackAndCheck([mockAnalysisMPCI], mockTelegramBot);

  let openTrades = tracker.getOpenTrades();
  if (openTrades.length === 1 && openTrades[0].symbol === 'MPCI') {
    console.log('✅ PASS: Successfully opened MPCI intraday trade recommendation!');
    console.log(`ℹ️ Open trade: Entry: ${openTrades[0].entryPrice} | Target: ${openTrades[0].targetPrice} | Stop Loss: ${openTrades[0].stopLossPrice}`);
  } else {
    console.error('❌ FAIL: MPCI trade was not opened.');
  }

  // ----------------------------------------------------
  // TEST CASE 2: Simulating no changes (Price within bounds)
  // ----------------------------------------------------
  console.log('\n--- 2. Simulating Price within bounds (102 EGP) ---');
  
  // Clone analysis but update current price
  const mockAnalysisMPCI_within: StockAnalysisResult = {
    ...mockAnalysisMPCI,
    quote: {
      ...mockAnalysisMPCI.quote,
      currentPrice: 102.0
    }
  };

  await tracker.trackAndCheck([mockAnalysisMPCI_within], mockTelegramBot);
  openTrades = tracker.getOpenTrades();
  if (openTrades.length === 1 && openTrades[0].status === 'OPEN') {
    console.log('✅ PASS: Trade remained OPEN when price is between SL and Target.');
  } else {
    console.error('❌ FAIL: Trade closed prematurely.');
  }

  // ----------------------------------------------------
  // TEST CASE 3: Simulating Target Hit
  // ----------------------------------------------------
  console.log('\n--- 3. Simulating Price Hit Target (107 EGP) ---');
  
  const mockAnalysisMPCI_targetHit: StockAnalysisResult = {
    ...mockAnalysisMPCI,
    quote: {
      ...mockAnalysisMPCI.quote,
      currentPrice: 107.0
    }
  };

  await tracker.trackAndCheck([mockAnalysisMPCI_targetHit], mockTelegramBot);
  
  openTrades = tracker.getOpenTrades();
  const closedTrades = tracker.getClosedTrades();
  
  if (openTrades.length === 0 && closedTrades.length === 1) {
    const trade = closedTrades[0];
    if (trade.status === 'CLOSED_TARGET_HIT' && trade.pnlPercentage === 7) {
      console.log('✅ PASS: Successfully closed trade as TARGET HIT with +7% profit!');
      console.log(`ℹ️ Closed trade statistics: Status: ${trade.status} | Close Price: ${trade.closePrice} | P&L: +${trade.pnlPercentage}%`);
    } else {
      console.error(`❌ FAIL: Trade status or P&L is incorrect: Status: ${trade.status}, P&L: ${trade.pnlPercentage}%`);
    }
  } else {
    console.error(`❌ FAIL: MPCI trade did not close correctly on target hit. Open count: ${openTrades.length}, Closed count: ${closedTrades.length}`);
  }

  // ----------------------------------------------------
  // TEST CASE 4: Simulating Cooldown check
  // ----------------------------------------------------
  console.log('\n--- 4. Simulating Cooldown behavior (Immediately after close) ---');
  
  // Try to open MPCI trade again on another strong buy signal immediately
  await tracker.trackAndCheck([mockAnalysisMPCI], mockTelegramBot);
  openTrades = tracker.getOpenTrades();
  
  if (openTrades.length === 0) {
    console.log('✅ PASS: Cooldown successfully prevented immediate reopening of MPCI trade!');
  } else {
    console.error('❌ FAIL: MPCI trade reopened ignoring the 4-hour cooldown period.');
  }

  // ----------------------------------------------------
  // TEST CASE 5: Open a new BUY trade recommendation (for another ticker, e.g. ABUK)
  // ----------------------------------------------------
  console.log('\n--- 5. Simulating BUY Signal for ABUK ---');
  
  const mockAnalysisABUK: StockAnalysisResult = {
    quote: {
      symbol: 'ABUK',
      yahooSymbol: 'ABUK.CA',
      nameEn: 'ABUK',
      nameAr: 'أبو قير للأسمدة',
      currentPrice: 80.0,
      previousClose: 81.0,
      change: -1.0,
      changePercent: -1.23,
      dayHigh: 81.5,
      dayLow: 79.5,
      fiftyTwoWeekHigh: 110.0,
      fiftyTwoWeekLow: 55.0,
      volume: 8000,
      avgVolume: 12000
    },
    indicators: {
      rsi: 35,
      sma20: 82,
      sma50: 85,
      support: 78,
      resistance: 85,
      volumeSpike: false,
      volumeRatio: 0.9
    },
    signalType: 'BUY',
    signalScore: 0.8,
    reasons: ['Oversold bounce expected'],
    fairValue: 95.0,
    fairValueConfidence: 'MEDIUM',
    fairValueUpsidePercent: 18.75,
    marketRegime: 'BULLISH',
    suggestedEntry: { min: 78.0, max: 81.0 },
    suggestedTarget: { target1: 84.0, target2: 88.0 },
    suggestedStopLoss: 77.0,
    positionSizePercent: 8,
    riskRewardRatio: 1.5,
    timestamp: new Date(),
    
    // Intraday fields
    intradaySignal: 'BUY',
    intradayScore: 1.5,
    intradayReasons: ['ارتداد وشيك من مستوى دعم قوي (78 ج.م)', 'مؤشر RSI يبدأ الصعود'],
    intradayEntry: 80.0,
    intradayTarget: 83.5,
    intradayStopLoss: 78.5
  };

  await tracker.trackAndCheck([mockAnalysisABUK], mockTelegramBot);
  openTrades = tracker.getOpenTrades();
  
  if (openTrades.length === 1 && openTrades[0].symbol === 'ABUK') {
    console.log('✅ PASS: Successfully opened ABUK intraday trade recommendation!');
  } else {
    console.error('❌ FAIL: ABUK trade was not opened.');
  }

  // ----------------------------------------------------
  // TEST CASE 6: Simulating Stop Loss Hit
  // ----------------------------------------------------
  console.log('\n--- 6. Simulating Price Hit Stop Loss (77.5 EGP) ---');
  
  const mockAnalysisABUK_stopLossHit: StockAnalysisResult = {
    ...mockAnalysisABUK,
    quote: {
      ...mockAnalysisABUK.quote,
      currentPrice: 77.5
    }
  };

  await tracker.trackAndCheck([mockAnalysisABUK_stopLossHit], mockTelegramBot);
  
  openTrades = tracker.getOpenTrades();
  const allClosed = tracker.getClosedTrades();
  const abukClosed = allClosed.find(t => t.symbol === 'ABUK');
  
  if (openTrades.length === 0 && abukClosed) {
    if (abukClosed.status === 'CLOSED_STOP_LOSS_HIT' && abukClosed.pnlPercentage === -3.13) {
      console.log('✅ PASS: Successfully closed trade as STOP LOSS HIT with -3.13% loss!');
      console.log(`ℹ️ Closed trade statistics: Status: ${abukClosed.status} | Close Price: ${abukClosed.closePrice} | P&L: ${abukClosed.pnlPercentage}%`);
    } else {
      console.error(`❌ FAIL: Trade status or P&L is incorrect: Status: ${abukClosed.status}, P&L: ${abukClosed.pnlPercentage}%`);
    }
  } else {
    console.error(`❌ FAIL: ABUK trade did not close correctly on stop loss hit. Open count: ${openTrades.length}`);
  }

  console.log('\n🏁 Intraday Tracker validation completed successfully!');
}

runIntradayTrackerTest().catch(err => {
  console.error('🔴 Unhandled error during validation:', err);
});
