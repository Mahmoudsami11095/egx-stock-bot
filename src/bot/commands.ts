import { Telegraf, Context } from 'telegraf';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { StateManager } from '../services/stateManager';
import { formatSignalCard, formatWatchlistStatus } from './templates';
import { logger } from '../services/logger';

export function setupCommands(
  bot: Telegraf,
  stateManager: StateManager,
  dataFetcher: DataFetcherService,
  signalDetector: SignalDetectorService
) {
  // 1. /start & /help
  bot.command(['start', 'help'], (ctx: Context) => {
    const helpMsg = `
<b>🤖 أهلاً بك في بوت توصيات ومؤشرات البورصة المصرية (EGX Stock Signals Bot)</b>

هذا البوت يراقب حركة أسهم البورصة المصرية لحظياً من منصة TradingView، ويقوم بحساب <b>القيمة العادلة تلقائياً (Automated Fair Value)</b>، وتحليل المؤشرات الفنية (RSI, Moving Averages, Support/Resistance, Volume) وإرسال إشارات الشراء والبيع وتنبيهات الكسر والارتداد تلقائياً.

<b>📋 الأوامر المتاحة (Commands):</b>
• <code>/status</code> - ملخص سريع لحالة جميع الأسهم المتابعة والتغير اليومي والأسعار والقيمة العادلة التلقائية.
• <code>/signals TICKER</code> - تحليل فني شامل وتفصيلي لسهم معين (مثال: <code>/signals MPCI</code>).
• <code>/add TICKER</code> - إضافة سهم جديد لقائمة المتابعة (مثال: <code>/add COMI</code>).
• <code>/remove TICKER</code> - حذف سهم من قائمة المتابعة.

<b>📊 الأسهم المتابعة حالياً:</b>
<code>${stateManager.getWatchlist().map((s) => s.symbol).join(', ')}</code>
`;
    ctx.replyWithHTML(helpMsg);
  });

  // 2. /status
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
        } catch (err) {
          logger.error(`Error analyzing ${stock.symbol} for status: ${err}`);
        }
      }

      if (analyses.length === 0) {
        return ctx.reply('⚠️ تعذر جلب بيانات الأسهم حالياً. يرجى المحاولة لاحقاً.');
      }

      const summaryHtml = formatWatchlistStatus(analyses);
      ctx.replyWithHTML(summaryHtml);
    } catch (error) {
      logger.error(`Error handling /status: ${error}`);
      ctx.reply('❌ حدث خطأ أثناء تنفيذ الأمر.');
    }
  });

  // 3. /signals [TICKER]
  bot.command('signals', async (ctx: Context) => {
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.trim().split(/\s+/);
    const symbol = parts[1]?.toUpperCase();

    if (!symbol) {
      return ctx.reply('⚠️ يرجى تحديد رمز السهم. مثال: `/signals MPCI`', { parse_mode: 'Markdown' });
    }

    const stock = stateManager.findStock(symbol) || {
      symbol,
      yahooSymbol: `${symbol}.CA`,
      nameEn: symbol,
      nameAr: symbol,
      sector: 'General',
    };

    ctx.reply(`📊 جاري حساب القيمة العادلة وإجراء التحليل الفني لسهم ${stock.nameAr} (${symbol})...`);

    try {
      const { quote, indicators, automatedFairValue } = await dataFetcher.getQuoteAndIndicators(stock);
      const analysis = signalDetector.analyzeStockWithIndicators(stock, quote, indicators, automatedFairValue);

      const cardHtml = formatSignalCard(analysis);
      ctx.replyWithHTML(cardHtml);
    } catch (err) {
      logger.error(`Error in /signals for ${symbol}: ${err}`);
      ctx.reply(`❌ تعذر جلب التحليل لسهم ${symbol}. تأكد من صحة الرمز.`);
    }
  });

  // 4. /add [TICKER]
  bot.command('add', (ctx: Context) => {
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.trim().split(/\s+/);
    const symbol = parts[1]?.toUpperCase();

    if (!symbol) {
      return ctx.reply('⚠️ اكتب رمز السهم الذي تريد إضافته. مثال: `/add COMI`', { parse_mode: 'Markdown' });
    }

    const added = stateManager.addStock({
      symbol,
      yahooSymbol: `${symbol}.CA`,
      nameEn: symbol,
      nameAr: symbol,
      sector: 'Custom',
    });

    if (added) {
      ctx.reply(`✅ تم إضافة السهم <b>${symbol}</b> بنجاح إلى قائمة المتابعة وسيتم حساب قيمته العادلة تلقائياً!`, { parse_mode: 'HTML' });
    } else {
      ctx.reply(`ℹ️ السهم <b>${symbol}</b> موجود بالفعل في قائمة المتابعة.`, { parse_mode: 'HTML' });
    }
  });

  // 5. /remove [TICKER]
  bot.command('remove', (ctx: Context) => {
    const messageText = (ctx.message as any)?.text || '';
    const parts = messageText.trim().split(/\s+/);
    const symbol = parts[1]?.toUpperCase();

    if (!symbol) {
      return ctx.reply('⚠️ اكتب رمز السهم الذي تريد حذفه. مثال: `/remove MPCI`', { parse_mode: 'Markdown' });
    }

    const removed = stateManager.removeStock(symbol);
    if (removed) {
      ctx.reply(`🗑️ تم حذف السهم <b>${symbol}</b> من قائمة المتابعة.`, { parse_mode: 'HTML' });
    } else {
      ctx.reply(`⚠️ لم يتم العثور على السهم <b>${symbol}</b> في القائمة.`, { parse_mode: 'HTML' });
    }
  });
}
