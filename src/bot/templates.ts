import { StockAnalysisResult, SignalType } from '../types/stock';

export function getSignalEmoji(signal: SignalType): string {
  switch (signal) {
    case 'STRONG_BUY':
      return '🚀🟢 شراء قوي (Strong Buy)';
    case 'BUY':
      return '🟢 شراء (Buy)';
    case 'NEUTRAL':
      return '🟡 محايد (Hold/Neutral)';
    case 'SELL':
      return '🔴 بيع / جني أرباح (Sell)';
    case 'STRONG_SELL':
      return '🚨🔴 بيع قوي (Strong Sell)';
    default:
      return '🟡 محايد';
  }
}

export function formatSignalCard(analysis: StockAnalysisResult): string {
  const { quote, indicators, signalType, reasons, suggestedEntry, suggestedTarget, suggestedStopLoss, fairValue, fairValueUpsidePercent } = analysis;

  const icon = quote.change >= 0 ? '📈' : '📉';
  const sign = quote.change >= 0 ? '+' : '';
  const upsideSign = fairValueUpsidePercent >= 0 ? '+' : '';
  const signalBadge = getSignalEmoji(signalType);

  return `
<b>${signalBadge}</b>
<b>📊 تقرير التحليل الفني والقيمة العادلة لسهم ${quote.nameAr} (${quote.symbol})</b>

💵 <b>السعر اللحظي:</b> <code>${quote.currentPrice} ج.م</code> (${icon} ${sign}${quote.changePercent}%)
💎 <b>القيمة العادلة (Fair Value):</b> <code>${fairValue} ج.م</code> (نسبة نمو مقترحة <b>${upsideSign}${fairValueUpsidePercent}%</b>)
📊 <b>مؤشر القوة النسبية RSI (14):</b> <code>${indicators.rsi}</code>
🔹 <b>المتوسطات:</b> SMA20: <code>${indicators.sma20}</code> | SMA50: <code>${indicators.sma50}</code>
🛡️ <b>الدعم:</b> <code>${indicators.support} ج.م</code> | 🛡️ <b>المقاومة:</b> <code>${indicators.resistance} ج.م</code>

<b>💡 أسباب التوصية:</b>
${reasons.map((r) => `• ${r}`).join('\n')}

----------------------------------------
🎯 <b>خطة التداول المقترحة (Trading Plan):</b>
• 📥 <b>نطاق الدخول الآمن:</b> <code>${suggestedEntry.min} - ${suggestedEntry.max} ج.م</code>
• 🎯 <b>الهدف الأول (Target 1):</b> <code>${suggestedTarget.target1} ج.م</code>
• 🚀 <b>الهدف الثاني (القيمة العادلة):</b> <code>${suggestedTarget.target2} ج.م</code>
• 🛑 <b>موقف الخسارة (Stop Loss):</b> <code>${suggestedStopLoss} ج.م</code>

⏰ <i>توقيت الفحص: ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</i>
`.trim();
}

export function formatWatchlistStatus(analyses: StockAnalysisResult[]): string {
  // Sort descending by Fair Value Upside % (Highest gap first!)
  const sorted = [...analyses].sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);

  // Top recommended buy stocks (BUY or STRONG_BUY with highest upside)
  const topBuys = sorted.filter((a) => a.signalType === 'BUY' || a.signalType === 'STRONG_BUY').slice(0, 3);

  let text = `<b>📊 ملخص أسهم البورصة المصرية مرتبة حسب أعلى فارق للقيمة العادلة (EGX Upside Ranking)</b>\n\n`;

  if (topBuys.length > 0) {
    text += `<b>⭐ أفضل الأسهم الموصى بشرائها حالياً (Top Recommended Buy Opportunities):</b>\n`;
    for (const b of topBuys) {
      text += `🏆 <b>${b.quote.symbol} (${b.quote.nameAr}):</b> سعر <code>${b.quote.currentPrice} ج.م</code> ⬅️ قيمة عادلة <code>${b.fairValue} ج.م</code> (نمو متوقع <b>+${b.fairValueUpsidePercent}%</b>)\n`;
    }
    text += `----------------------------------------\n\n`;
  }

  for (const a of sorted) {
    const icon = a.quote.change >= 0 ? '🟢' : '🔴';
    const sign = a.quote.change >= 0 ? '+' : '';
    const signalBadge = getSignalEmoji(a.signalType);
    const upsideSign = a.fairValueUpsidePercent >= 0 ? '+' : '';

    text += `<b>${icon} ${a.quote.symbol} - ${a.quote.nameAr}</b>\n`;
    text += `السعر اللحظي: <code>${a.quote.currentPrice} ج.م</code> (${sign}${a.quote.changePercent}%)\n`;
    text += `💎 <b>القيمة العادلة:</b> <code>${a.fairValue} ج.م</code> (فارق نمو <b>${upsideSign}${a.fairValueUpsidePercent}%</b>)\n`;
    text += `الإشارة: ${signalBadge}\n`;
    text += `الدعم: <code>${a.indicators.support}</code> | المقاومة: <code>${a.indicators.resistance}</code>\n\n`;
  }

  text += `<i>💡 استخدم <code>/signals TICKER</code> للحصول على خطة تداول تفصيلية لسهم محدد.</i>`;
  return text;
}
