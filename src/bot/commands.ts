import { Telegraf, Context } from 'telegraf';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { StateManager } from '../services/stateManager';
import { GoldService } from '../services/goldService';
import { formatSignalCard, formatWatchlistStatus } from './templates';
import { logger } from '../services/logger';

export function setupCommands(
  bot: Telegraf,
  stateManager: StateManager,
  dataFetcher: DataFetcherService,
  signalDetector: SignalDetectorService,
  goldService: GoldService = new GoldService()
) {
  // 1. /start & /help
  bot.command(['start', 'help'], (ctx: Context) => {
    const chatId = ctx.chat?.id.toString();
    if (chatId) {
      stateManager.addSubscriber(chatId);
    }

    const helpMsg = `
<b>🤖 أهلاً بك في بوت توصيات البورصة والذهب (EGX Stock & Gold Signals Bot)</b>

تم تفعيل التنبيهات اللحظية والإشعارات التلقائية لحسابك بنجاح! 🎉

هذا البوت يراقب حركة أسهم البورصة المصرية وأسعار الذهب عالمياً وفي مصر لحظياً، ويقوم بحساب <b>القيمة العادلة تلقائياً</b>، وإرسال إشارات الشراء والبيع وتنبيهات الكسر والارتداد تلقائياً.

<b>📋 الأوامر المتاحة (Commands):</b>
• <code>/gold</code> - ⚜️ أسعار الذهب اللحظية في مصر (عيار 24، 21، 18 والجنيه الذهب) وعالمياً.
• <code>/status</code> - ملخص سريع لحالة جميع الأسهم المتابعة والتغير اليومي والأسعار والقيمة العادلة.
• <code>/signals TICKER</code> - تحليل فني شامل وتفصيلي لسهم معين (مثال: <code>/signals MPCI</code>).
• <code>/add TICKER</code> - إضافة سهم جديد لقائمة المتابعة (مثال: <code>/add COMI</code>).
• <code>/remove TICKER</code> - حذف سهم من قائمة المتابعة.

<b>📊 الأسهم المتابعة حالياً:</b>
<code>${stateManager.getWatchlist().map((s) => s.symbol).join(', ')}</code>
`;
    ctx.replyWithHTML(helpMsg);
  });

  // 2. /gold
  bot.command('gold', async (ctx: Context) => {
    ctx.reply('🔍 جاري فحص أسعار الذهب المباشرة في مصر وعالمياً...');
    try {
      const prices = await goldService.getLiveGoldPrices();
      const goldHtml = goldService.formatGoldMessage(prices);
      ctx.replyWithHTML(goldHtml);
    } catch (err) {
      logger.error(`Error handling /gold: ${err}`);
      ctx.reply('❌ تعذر جلب أسعار الذهب حالياً. يرجى المحاولة لاحقاً.');
    }
  });

  // 3. /status
  bot.command('status', async (ctx: Context) => {
    ctx.reply('🔍 جاري فحص الأسعار اللحظية وحساب القيمة العادلة التلقائية لأسهم البورصة المصرية...');
    try {
      const watchlist = stateManager.getWatchlist();
      const analyses = [];
      for (const stock of watchlist) {
        try {
          const { quote, indicators, automatedFairValue } = await dataFetcher.getQuoteAndIndicators(stock);
          const analysis = signalDetector.analyzeStockWithIndicators(stock, quote, indicators, automatedFairValue);
          analyses.push(analysis);
        } catch (err) { logger.error(`Error analyzing ${stock.symbol} for status: ${err}`); }
      }
      if (analyses.length === 0) return ctx.reply('⚠️ تعذر جلب بيانات الأسهم حالياً.');
      ctx.replyWithHTML(formatWatchlistStatus(analyses));
    } catch (error) { logger.error(`Error handling /status: ${error}`); ctx.reply('❌ حدث خطأ أثناء تنفيذ الأمر.'); }
  });

  // 4. /signals [TICKER]
  bot.command('signals', async (ctx: Context) => {
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.trim().split(/\s+/);
    const symbol = parts[1]?.toUpperCase();
    if (!symbol) return ctx.reply('⚠️ يرجى تحديد رمز السهم. مثال: `/signals MPCI`', { parse_mode: 'Markdown' });

    if (symbol === 'GOLD' || symbol === 'الذهب') {
      try {
        const prices = await goldService.getLiveGoldPrices();
        return ctx.replyWithHTML(goldService.formatGoldMessage(prices));
      } catch {
        return ctx.reply('❌ تعذر جلب أسعار الذهب.');
      }
    }

    const stock = stateManager.findStock(symbol) || { symbol, yahooSymbol: `${symbol}.CA`, nameEn: symbol, nameAr: symbol, sector: 'General' };
    ctx.reply(`📊 جاري حساب القيمة العادلة وإجراء التحليل الفني لسهم ${stock.nameAr} (${symbol})...`);

    try {
      const { quote, indicators, automatedFairValue } = await dataFetcher.getQuoteAndIndicators(stock);
      const analysis = signalDetector.analyzeStockWithIndicators(stock, quote, indicators, automatedFairValue);
      ctx.replyWithHTML(formatSignalCard(analysis));
    } catch (err) { logger.error(`Error in /signals for ${symbol}: ${err}`); ctx.reply(`❌ تعذر جلب التحليل لسهم ${symbol}.`); }
  });

  // 5. /add [TICKER]
  bot.command('add', (ctx: Context) => {
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.trim().split(/\s+/);
    const symbol = parts[1]?.toUpperCase();
    if (!symbol) return ctx.reply('⚠️ اكتب رمز السهم. مثال: `/add COMI`', { parse_mode: 'Markdown' });

    const added = stateManager.addStock({ symbol, yahooSymbol: `${symbol}.CA`, nameEn: symbol, nameAr: symbol, sector: 'Custom' });
    if (added) ctx.reply(`✅ تم إضافة السهم <b>${symbol}</b> بنجاح إلى قائمة المتابعة!`, { parse_mode: 'HTML' });
    else ctx.reply(`ℹ️ السهم <b>${symbol}</b> موجود بالفعل في القائمة.`, { parse_mode: 'HTML' });
  });

  // 6. /remove [TICKER]
  bot.command('remove', (ctx: Context) => {
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.trim().split(/\s+/);
    const symbol = parts[1]?.toUpperCase();
    if (!symbol) return ctx.reply('⚠️ اكتب رمز السهم. مثال: `/remove MPCI`', { parse_mode: 'Markdown' });

    const removed = stateManager.removeStock(symbol);
    if (removed) ctx.reply(`🗑️ تم حذف السهم <b>${symbol}</b> من القائمة.`, { parse_mode: 'HTML' });
    else ctx.reply(`⚠️ لم يتم العثور على السهم <b>${symbol}</b> في القائمة.`, { parse_mode: 'HTML' });
  });
}
