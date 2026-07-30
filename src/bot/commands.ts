import { Telegraf, Context } from 'telegraf';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { StateManager } from '../services/stateManager';
import { GoldService } from '../services/goldService';
import { ShariaService } from '../services/shariaService';
import { ExportService } from '../services/exportService';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { formatSignalCard, formatWatchlistStatus } from './templates';
import { logger } from '../services/logger';

export function setupCommands(
  bot: Telegraf,
  stateManager: StateManager,
  dataFetcher: DataFetcherService,
  signalDetector: SignalDetectorService,
  goldService: GoldService = new GoldService(),
  shariaService: ShariaService = new ShariaService(),
  exportService: ExportService = new ExportService(),
  googleSheetsService: GoogleSheetsService = new GoogleSheetsService()
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

هذا البوت يراقب حركة <b>الأسهم الحلال المتوافقة مع الشريعة الإسلامية</b> وأسعار الذهب لحظياً، ويقوم بحساب <b>القيمة العادلة تلقائياً</b>، ومتابعة التوافق الشرعي أسبوعياً، وتحديث شيت Google Sheets و CSV أوتوماتيكياً!

<b>📋 الأوامر المتاحة (Commands):</b>
• <code>/status</code> - 📊 ملخص للأسهم المتابعة وتحديث شيت Google Sheets و Excel تلقائياً.
• <code>/sheet</code> - 📁 إرسال شيت Excel/CSV الحالي وتحديث Google Sheet أونلاين.
• <code>/halal</code> - 🕌 عرض قائمة الأسهم الحلال المتوافقة مع الشريعة في البورصة المصرية.
• <code>/gold</code> - ⚜️ أسعار الذهب اللحظية في مصر (عيار 24، 21، 18 والجنيه الذهب) وعالمياً.
• <code>/signals TICKER</code> - تحليل فني شامل وتفصيلي لأي سهم (مثال: <code>/signals ABUK</code> أو <code>/signals MPCI</code>).
• <code>/add TICKER</code> - إضافة سهم جديد لقائمة المتابعة الحلال.
• <code>/remove TICKER</code> - حذف سهم من قائمة المتابعة.

<b>📊 الأسهم المتابعة حالياً:</b>
<code>${stateManager.getWatchlist().map((s) => s.symbol).join(', ')}</code>
`;
    ctx.replyWithHTML(helpMsg);
  });

  // 2. /sheet - Generate CSV and sync to live Google Sheet
  bot.command(['sheet', 'excel', 'csv'], async (ctx: Context) => {
    ctx.reply('📊 جاري تجهيز وتحديث شيت Excel و Google Sheets أونلاين...');
    try {
      const watchlist = stateManager.getWatchlist();
      const batchResults = await dataFetcher.getBatchQuoteAndIndicators(watchlist);
      const analyses = batchResults.map((r) =>
        signalDetector.analyzeStockWithIndicators(r.stock, r.quote, r.indicators, r.automatedFairValue)
      );

      analyses.sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);

      // Sync to Live Google Sheet
      await googleSheetsService.syncToGoogleSheet(analyses);

      const filePath = exportService.generateCsv(analyses);
      await ctx.replyWithDocument({ source: filePath }, { caption: '📊 شيت تحليل أسهم البورصة المصرية المحدث والقيم العادلة وتوصيات الشراء (Excel / Google Sheets Compatible)' });
    } catch (error) {
      logger.error(`Error generating sheet: ${error}`);
      ctx.reply('❌ حدث خطأ أثناء إنشاء شيت البيانات.');
    }
  });

  // 3. /halal or /sharia
  bot.command(['halal', 'sharia'], (ctx: Context) => {
    const watchlist = stateManager.getWatchlist();
    const msg = shariaService.formatHalalStocksListMessage(watchlist);
    ctx.replyWithHTML(msg);
  });

  // 4. /gold
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

  // 5. /status - BATCH SCAN & AUTO SYNC TO GOOGLE SHEETS & EXCEL
  bot.command('status', async (ctx: Context) => {
    ctx.reply('🔍 جاري فحص الأسعار اللحظية وتحديث شيت Google Sheets وشيت Excel المحدث...');
    try {
      const watchlist = stateManager.getWatchlist();
      const batchResults = await dataFetcher.getBatchQuoteAndIndicators(watchlist);

      if (batchResults.length === 0) {
        return ctx.reply('⚠️ تعذر جلب بيانات الأسهم حالياً. يرجى المحاولة لاحقاً.');
      }

      const analyses = batchResults.map((r) =>
        signalDetector.analyzeStockWithIndicators(r.stock, r.quote, r.indicators, r.automatedFairValue)
      );

      // Sort descending by Fair Value Upside %
      analyses.sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);

      // 1. Sync Live Data to Google Sheet
      await googleSheetsService.syncToGoogleSheet(analyses);

      // 2. Send HTML status text cards in chunks
      const chunkSize = 6;
      for (let i = 0; i < analyses.length; i += chunkSize) {
        const chunk = analyses.slice(i, i + chunkSize);
        const htmlMsg = formatWatchlistStatus(chunk);
        await ctx.replyWithHTML(htmlMsg);
      }

      // 3. Automatically generate and attach updated Excel/CSV sheet
      const filePath = exportService.generateCsv(analyses);
      await ctx.replyWithDocument({ source: filePath }, { caption: '📊 شيت Excel/CSV المحدث لجميع أسهم البورصة وقيمها العادلة وتوصيات الشراء' });
    } catch (error) {
      logger.error(`Error handling /status: ${error}`);
      ctx.reply('❌ حدث خطأ أثناء جلب حالة الأسهم.');
    }
  });

  // 6. /signals [TICKER] - Allow technical analysis for ANY stock, with Sharia Compliance Badge!
  bot.command('signals', async (ctx: Context) => {
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.trim().split(/\s+/);
    const symbol = parts[1]?.toUpperCase();
    if (!symbol) return ctx.reply('⚠️ يرجى تحديد رمز السهم. مثال: `/signals ABUK` أو `/signals MPCI`', { parse_mode: 'Markdown' });

    if (symbol === 'GOLD' || symbol === 'الذهب') {
      try {
        const prices = await goldService.getLiveGoldPrices();
        return ctx.replyWithHTML(goldService.formatGoldMessage(prices));
      } catch {
        return ctx.reply('❌ تعذر جلب أسعار الذهب.');
      }
    }

    const shariaInfo = shariaService.getShariaInfo(symbol);
    const stock = stateManager.findStock(symbol) || { symbol, yahooSymbol: `${symbol}.CA`, nameEn: symbol, nameAr: shariaInfo.nameAr || symbol, sector: 'General' };

    ctx.reply(`📊 جاري إجراء التحليل الفني وحساب القيمة العادلة لسهم ${stock.nameAr} (${symbol})...`);

    try {
      const { quote, indicators, automatedFairValue } = await dataFetcher.getQuoteAndIndicators(stock);
      const analysis = signalDetector.analyzeStockWithIndicators(stock, quote, indicators, automatedFairValue);
      ctx.replyWithHTML(formatSignalCard(analysis, shariaInfo));
    } catch (err) { logger.error(`Error in /signals for ${symbol}: ${err}`); ctx.reply(`❌ تعذر جلب التحليل لسهم ${symbol}. تأكد من صحة الرمز.`); }
  });

  // 7. /add [TICKER]
  bot.command('add', (ctx: Context) => {
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.trim().split(/\s+/);
    const symbol = parts[1]?.toUpperCase();
    if (!symbol) return ctx.reply('⚠️ اكتب رمز السهم. مثال: `/add EGAL`', { parse_mode: 'Markdown' });

    if (!shariaService.isStockHalal(symbol)) {
      return ctx.reply(`⚠️ عذراً، السهم <b>${symbol}</b> غير متوافق مع أحكام الشريعة الإسلامية ولا يمكن إضافته للقائمة الحلال.`, { parse_mode: 'HTML' });
    }

    const added = stateManager.addStock({ symbol, yahooSymbol: `${symbol}.CA`, nameEn: symbol, nameAr: symbol, sector: 'Custom' });
    if (added) ctx.reply(`✅ تم إضافة السهم الحلال <b>${symbol}</b> بنجاح إلى قائمة المتابعة!`, { parse_mode: 'HTML' });
    else ctx.reply(`ℹ️ السهم <b>${symbol}</b> موجود بالفعل في القائمة.`, { parse_mode: 'HTML' });
  });

  // 8. /remove [TICKER]
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
