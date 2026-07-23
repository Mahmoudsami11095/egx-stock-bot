import { StockAnalysisResult, SignalType } from '../types/stock';

export function getSignalEmoji(signal: SignalType): string {
  switch (signal) {
    case 'STRONG_BUY':
      return '🚀🟢 [STRONG BUY / شراء قوي]';
    case 'BUY':
      return '🟢 [BUY / شراء]';
    case 'SELL':
      return '🔴 [SELL / بيع]';
    case 'STRONG_SELL':
      return '🚨🔴 [STRONG SELL / بيع قوي - وقف خسارة]';
    default:
      return '🟡 [NEUTRAL / محايد]';
  }
}

export function formatSignalCard(analysis: StockAnalysisResult): string {
  const { quote, indicators, signalType, reasons, fairValue, fairValueUpsidePercent, suggestedEntry, suggestedTarget, suggestedStopLoss } = analysis;
  const emojiHeader = getSignalEmoji(signalType);
  const changeIcon = quote.change >= 0 ? '📈' : '📉';
  const sign = quote.change >= 0 ? '+' : '';
  const upsideSign = fairValueUpsidePercent >= 0 ? '+' : '';
  const upsideBadge = fairValueUpsidePercent >= 0 ? '💚 فرصة نمو' : '⚠️ أعلى من القيمة العادلة';

  return `
<b>${emojiHeader}</b>
<b>السهم: ${quote.nameAr} (${quote.symbol})</b>
<i>${quote.nameEn}</i>

💵 <b>السعر الحالي:</b> <code>${quote.currentPrice} EGP</code> (${changeIcon} ${sign}${quote.changePercent}%)
💎 <b>القيمة العادلة (Fair Value):</b> <code>${fairValue} EGP</code> (فارق <b>${upsideSign}${fairValueUpsidePercent}%</b> ${upsideBadge})
📊 <b>حجم التداول اليومي:</b> <code>${quote.volume.toLocaleString()}</code> (مقارنة بـ ${indicators.volumeRatio}x المتوسط)
----------------------------------------
<b>📐 المؤشرات الفنية (Technical Indicators):</b>
• <b>RSI (14):</b> <code>${indicators.rsi}</code> ${indicators.rsi < 35 ? '🔥 (قاع/تشبع بيعي)' : indicators.rsi > 70 ? '⚠️ (تضخم)' : ''}
• <b>المتوسط المتحرك 20:</b> <code>${indicators.sma20} EGP</code>
• <b>المتوسط المتحرك 50:</b> <code>${indicators.sma50} EGP</code>
• <b>مستوى الدعم (Support):</b> <code>${indicators.support} EGP</code>
• <b>مستوى المقاومة (Resistance):</b> <code>${indicators.resistance} EGP</code>

<b>💡 أسباب التوصية (Key Signals):</b>
${reasons.map((r) => `• ${r}`).join('\n')}

----------------------------------------
<b>🎯 خطة التداول المقترحة (Trading Plan):</b>
• 📥 <b>نطاق الدخول الآمن:</b> <code>${suggestedEntry.min} - ${suggestedEntry.max} EGP</code>
• 🎯 <b>الهدف الأول (Target 1):</b> <code>${suggestedTarget.target1} EGP</code>
• 🚀 <b>الهدف الثاني (القيمة العادلة Target 2):</b> <code>${suggestedTarget.target2} EGP</code>
• 🛑 <b>وقف الخسارة (Stop Loss):</b> <code>${suggestedStopLoss} EGP</code>

⏰ <i>التوقيت: ${analysis.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</i>
`.trim();
}

export function formatWatchlistStatus(analyses: StockAnalysisResult[]): string {
  let text = `<b>📊 ملخص أسهم البورصة المصرية والقيمة العادلة (EGX Watchlist & Fair Values)</b>\n\n`;

  for (const a of analyses) {
    const icon = a.quote.change >= 0 ? '🟢' : '🔴';
    const sign = a.quote.change >= 0 ? '+' : '';
    const signalBadge = getSignalEmoji(a.signalType);
    const upsideSign = a.fairValueUpsidePercent >= 0 ? '+' : '';

    text += `<b>${icon} ${a.quote.symbol} - ${a.quote.nameAr}</b>\n`;
    text += `السعر اللحظي: <code>${a.quote.currentPrice} ج.م</code> (${sign}${a.quote.changePercent}%)\n`;
    text += `💎 <b>القيمة العادلة:</b> <code>${a.fairValue} ج.م</code> (فارق <b>${upsideSign}${a.fairValueUpsidePercent}%</b>)\n`;
    text += `الإشارة: ${signalBadge}\n`;
    text += `الدعم: <code>${a.indicators.support}</code> | المقاومة: <code>${a.indicators.resistance}</code>\n\n`;
  }

  text += `<i>💡 استخدم الأمر <code>/signals TICKER</code> (مثل <code>/signals MPCI</code>) للحصول على تقرير فني تفصيلي والقيمة العادلة.</i>`;
  return text;
}
