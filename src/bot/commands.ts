import { Telegraf, Context } from 'telegraf';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { StateManager } from '../services/stateManager';
import { GoldService } from '../services/goldService';
import { ShariaService } from '../services/shariaService';
import { formatSignalCard, formatWatchlistStatus } from './templates';
import { logger } from '../services/logger';

export function setupCommands(
  bot: Telegraf,
  stateManager: StateManager,
  dataFetcher: DataFetcherService,
  signalDetector: SignalDetectorService,
  goldService: GoldService = new GoldService(),
  shariaService: ShariaService = new ShariaService()
) {
  // 1. /start & /help
  bot.command(['start', 'help'], (ctx: Context) => {
    const chatId = ctx.chat?.id.toString();
    if (chatId) {
      stateManager.addSubscriber(chatId);
    }

    const helpMsg = `
<b>🤖 أهلاً بك في بوت توصيات البورصة والذهب المتوافق مع الشريعة (Halal EGX & Gold Bot)</b>

تم تفعيل التنبيهات اللحظية والإشعارات التلقائية لحسابك بنجاح! 🎉

هذا البوت يراقب حركة <b>الأسهم الحلال المتوافقة مع الشريعة الإسلامية</b> وأسعار الذهب لحظياً، ويقوم بحساب <b>القيمة العادلة تلقائياً</b>، ومتابعة التوافق الشرعي أسبوعياً واستبعاد أي أسهم غير شرعية تلقائياً!

<b>📋 الأوامر المتاحة (Commands):</b>
• <code>/halal</code> - 🕌 عرض قائمة الأسهم الحلال المتوافقة مع الشريعة في البورصة المصرية.
• <code>/gold</code> - ⚜️ أسعار الذهب اللحظية في مصر (عيار 24، 21، 18 والجنيه الذهب) وعالمياً.
• <code>/status</code> - ملخص سريع لحالة جميع الأسهم المتابعة والتغير اليومي والأسعار والقيمة العادلة.
• <code>/signals TICKER</code> - تحليل فني شامل وتفصيلي لسهم معين (مثال: <code>/signals MPCI</code>).
• <code>/add TICKER</code> - إضافة سهم جديد لقائمة المتابعة.
• <code>/remove TICKER</code> - حذف سهم من قائمة المتابعة.

<b>📊 الأسهم المتابعة حالياً:</b>
<code>${stateManager.getWatchlist().map((s) => s.symbol).join(', ')}</code>
`;
    ctx.replyWithHTML(helpMsg);
  });

  // 2. /halal or /sharia
  bot.command(['halal', 'sharia'], (ctx: Context) => {
    const watchlist = stateManager.getWatchlist();
    const msg = shariaService.formatHalalStocksListMessage(watchlist);
    ctx.replyWithHTML(msg);
  });

  // 3. /gold
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

  // 4. /status - ⚡ LIGHTNING FAST BATCH SCAN & CHUNKED DELIVERY (<1s)
  bot.command('status', async (ctx: Context) => {
    ctx.reply('🔍 جاري فحص الأسعار اللحظية وحساب القيمة العادلة لأسهم البورصة المصرية...');
    try {
      const watchlist = stateManager.getWatchlist();
      const batchResults = await dataFetcher.getBatchQuoteAndIndicators(watchlist);

      if (batchResults.length === 0) {
        return ctx.reply('⚠️ تعذر جلب بيانات الأسهم حالياً. يرجى المحاولة لاحقاً.');
      }

      const analyses = batchResults.map((r) =>
        signalDetector.analyzeStockWithIndicators(r.stock, r.quote, r.indicators, r.automatedFairValue)
      );

      // Send in chunks of 6 stocks to guarantee instant delivery and zero Telegram size limit errors
      const chunkSize = 6;
      for (let i = 0; i < analyses.length; i += chunkSize) {
        const chunk = analyses.slice(i, i + chunkSize);
        const htmlMsg = formatWatchlistStatus(chunk);
        await ctx.replyWithHTML(htmlMsg);
      }
    } catch (error) {
      logger.error(`Error handling /status: ${error}`);
      ctx.reply('❌ حدث خطأ أثناء جلب حالة الأسهم.');
    }
  });

  // 5. /signals [TICKER]
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

    // Check Sharia status
    if (!shariaService.isStockHalal(symbol)) {
      return ctx.replyWithHTML(
        `⚠️ <b>تنويه شرعي (Sharia Warning):</b> السهم <b>${symbol}</b> غير مدرج ضمن قائمة الأسهم المتوافقة مع الشريعة الإسلامية.`
      );
    }

    const stock = stateManager.findStock(symbol) || { symbol, yahooSymbol: `${symbol}.CA`, nameEn: symbol, nameAr: symbol, sector: 'General' };
    ctx.reply(`📊 جاري حساب القيمة العادلة وإجراء التحليل الفني لسهم ${stock.nameAr} (${symbol})...`);

    try {
      const { quote, indicators, automatedFairValue } = await dataFetcher.getQuoteAndIndicators(stock);
      const analysis = signalDetector.analyzeStockWithIndicators(stock, quote, indicators, automatedFairValue);
      ctx.replyWithHTML(formatSignalCard(analysis));
    } catch (err) { logger.error(`Error in /signals for ${symbol}: ${err}`); ctx.reply(`❌ تعذر جلب التحليل لسهم ${symbol}. تأكد من صحة الرمز.`); }
  });

  // 6. /add [TICKER]
  bot.command('add', (ctx: Context) => {
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.trim().split(/\s+/);
    const symbol = parts[1]?.toUpperCase();
    if (!symbol) return ctx.reply('⚠️ اكتب رمز السهم. مثال: `/add EGAL`', { parse_mode: 'Markdown' });

    if (!shariaService.isStockHalal(symbol)) {
      return ctx.reply(`⚠️ عذراً، السهم <b>${symbol}</b> غير متوافق مع أحكام الشريعة الإسلامية ولا يمكن إضافته.`, { parse_mode: 'HTML' });
    }

    const added = stateManager.addStock({ symbol, yahooSymbol: `${symbol}.CA`, nameEn: symbol, nameAr: symbol, sector: 'Custom' });
    if (added) ctx.reply(`✅ تم إضافة السهم الحلال <b>${symbol}</b> بنجاح إلى قائمة المتابعة!`, { parse_mode: 'HTML' });
    else ctx.reply(`ℹ️ السهم <b>${symbol}</b> موجود بالفعل في القائمة.`, { parse_mode: 'HTML' });
  });

  // 7. /remove [TICKER]
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
