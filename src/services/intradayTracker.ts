import fs from 'fs';
import path from 'path';
import { IntradayTrade, StockAnalysisResult } from '../types/stock';
import { logger } from './logger';
import { TelegramBotService } from '../bot/telegramBot';

export class IntradayTrackerService {
  private filePath: string;
  private trades: IntradayTrade[] = [];

  constructor() {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      this.filePath = path.join(dataDir, 'intraday_trades.json');
    } catch (_) {
      this.filePath = path.join('/tmp', 'intraday_trades.json');
    }
    this.loadTrades();
  }

  private loadTrades(): void {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.trades = JSON.parse(raw);
      } catch (err) {
        logger.error(`Error loading intraday_trades.json: ${err}`);
        this.trades = [];
      }
    } else {
      this.trades = [];
    }
  }

  private saveTrades(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.trades, null, 2), 'utf-8');
    } catch (err) {
      logger.error(`Failed to save intraday_trades.json: ${err}`);
    }
  }

  public getOpenTrades(): IntradayTrade[] {
    return this.trades.filter((t) => t.status === 'OPEN');
  }

  public getClosedTrades(): IntradayTrade[] {
    return this.trades.filter((t) => t.status !== 'OPEN');
  }

  public getAllTrades(): IntradayTrade[] {
    return this.trades;
  }

  public getOpenTradeBySymbol(symbol: string): IntradayTrade | undefined {
    return this.trades.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase() && t.status === 'OPEN');
  }

  public clearAllTrades(): void {
    this.trades = [];
    this.saveTrades();
  }

  public async checkTradeClosures(
    updates: { symbol: string; price: number; high?: number; low?: number; nameAr?: string }[],
    telegramBot: TelegramBotService
  ): Promise<void> {
    let updated = false;

    for (const update of updates) {
      const openTrade = this.getOpenTradeBySymbol(update.symbol);
      if (!openTrade) continue;

      const closed = await this.evaluateAndCloseTrade(
        openTrade,
        update.price,
        update.high ?? update.price,
        update.low ?? update.price,
        telegramBot,
        update.nameAr
      );

      if (closed) updated = true;
    }

    if (updated) {
      this.saveTrades();
    }
  }

  private async evaluateAndCloseTrade(
    openTrade: IntradayTrade,
    currentPrice: number,
    high: number,
    low: number,
    telegramBot: TelegramBotService,
    nameAr?: string
  ): Promise<boolean> {
    const symbol = openTrade.symbol;
    const now = new Date().toISOString();
    const highPrice = Math.max(currentPrice, high);
    const lowPrice = Math.min(currentPrice, low);

    let targetHit = highPrice >= openTrade.targetPrice;
    let stopLossHit = lowPrice <= openTrade.stopLossPrice;

    if (targetHit && stopLossHit) {
      const distToTarget = Math.abs(openTrade.targetPrice - openTrade.entryPrice);
      const distToStop = Math.abs(openTrade.entryPrice - openTrade.stopLossPrice);
      if (distToStop <= distToTarget) {
        targetHit = false;
      } else {
        stopLossHit = false;
      }
    }

    if (!targetHit && !stopLossHit) return false;

    openTrade.closePrice = currentPrice;
    openTrade.closeTime = now;
    openTrade.pnlPercentage = Number((((currentPrice - openTrade.entryPrice) / openTrade.entryPrice) * 100).toFixed(2));
    const displayName = nameAr || symbol;

    if (targetHit) {
      openTrade.status = 'CLOSED_TARGET_HIT';
      logger.info(`🎯 [Intraday] Target Hit for ${symbol}: High ${highPrice} >= Target ${openTrade.targetPrice}`);

      const message = `
🎯 <b>تم تحقيق الهدف اللحظي لـ ${symbol}!</b> 🟢

💰 سهم: <b>${symbol}</b> (${displayName})
💵 سعر الدخول: <code>${openTrade.entryPrice} ج.م</code>
🚀 سعر الإغلاق: <code>${currentPrice} ج.م</code>
🎯 الهدف المحقق: <code>${openTrade.targetPrice} ج.م</code>
📉 وقف الخسارة: <code>${openTrade.stopLossPrice} ج.م</code>
📊 نسبة الربح: <b>+${openTrade.pnlPercentage}%</b> 📈
⏰ وقت التوصية: <i>${new Date(openTrade.entryTime).toLocaleString('ar-EG')}</i>
`.trim();
      await telegramBot.broadcastRawMessage(message);
    } else {
      openTrade.status = 'CLOSED_STOP_LOSS_HIT';
      logger.info(`🚨 [Intraday] Stop Loss Hit for ${symbol}: Low ${lowPrice} <= Stop Loss ${openTrade.stopLossPrice}`);

      const message = `
🚨 <b>تم تفعيل وقف الخسارة اللحظي لـ ${symbol}!</b> 🔴

📉 سهم: <b>${symbol}</b> (${displayName})
💵 سعر الدخول: <code>${openTrade.entryPrice} ج.م</code>
💔 سعر الإغلاق: <code>${currentPrice} ج.م</code>
🎯 الهدف المفقود: <code>${openTrade.targetPrice} ج.م</code>
📉 وقف الخسارة: <code>${openTrade.stopLossPrice} ج.م</code>
📊 نسبة الخسارة: <b>${openTrade.pnlPercentage}%</b> 📉
⏰ وقت التوصية: <i>${new Date(openTrade.entryTime).toLocaleString('ar-EG')}</i>
`.trim();
      await telegramBot.broadcastRawMessage(message);
    }

    return true;
  }

  public async trackAndCheck(
    analyses: StockAnalysisResult[],
    telegramBot: TelegramBotService
  ): Promise<void> {
    const now = new Date().toISOString();
    let updated = false;

    for (const analysis of analyses) {
      const symbol = analysis.quote.symbol;
      const currentPrice = analysis.quote.currentPrice;
      const dayHigh = analysis.quote.dayHigh || currentPrice;
      const dayLow = analysis.quote.dayLow || currentPrice;
      const openTrade = this.getOpenTradeBySymbol(symbol);

      if (openTrade) {
        const closed = await this.evaluateAndCloseTrade(
          openTrade,
          currentPrice,
          dayHigh,
          dayLow,
          telegramBot,
          analysis.quote.nameAr
        );
        if (closed) updated = true;
      } else {
        // No open trade, check if we should create a new recommendation
        const signal = analysis.intradaySignal;
        const entryPrice = analysis.intradayEntry || currentPrice;
        const targetPrice = analysis.intradayTarget;
        const stopLossPrice = analysis.intradayStopLoss;
        const tp1 = analysis.intradayTp1;
        const tp2 = analysis.intradayTp2;
        const tp3 = analysis.intradayTp3;

        if (signal === 'BUY' || signal === 'STRONG_BUY') {
          logger.info(`[DEBUG IntradayTracker] Evaluating ${symbol}: Signal=${signal}, Entry=${entryPrice}, Target=${targetPrice}, StopLoss=${stopLossPrice}`);
        }

        if ((signal === 'BUY' || signal === 'STRONG_BUY') && targetPrice && stopLossPrice) {
          // Check for cooldown to avoid immediate reopening of recently closed trades for the same ticker (30 min)
          const recentClosedTrades = this.trades.filter(
            (t) => t.symbol.toUpperCase() === symbol.toUpperCase() && 
                   t.status !== 'OPEN' && 
                   (Date.now() - new Date(t.closeTime || '').getTime() < 30 * 60 * 1000) // 30 minutes cooldown
          );

          if (recentClosedTrades.length === 0) {
            const newTrade: IntradayTrade = {
              id: `${symbol}_${Date.now()}`,
              symbol,
              recommendationType: signal,
              entryPrice,
              targetPrice,
              stopLossPrice,
              tp1,
              tp2,
              tp3,
              entryTime: now,
              status: 'OPEN'
            };

            this.trades.push(newTrade);
            updated = true;
            logger.info(`🆕 [Intraday] Opened new trade recommendation for ${symbol} @ ${entryPrice}`);

            const tp1Percent = tp1 ? (((tp1 - entryPrice) / entryPrice) * 100).toFixed(2) : 0;
            const tp2Percent = tp2 ? (((tp2 - entryPrice) / entryPrice) * 100).toFixed(2) : 0;
            const tp3Percent = tp3 ? (((tp3 - entryPrice) / entryPrice) * 100).toFixed(2) : 0;
            const slPercent = (((stopLossPrice - entryPrice) / entryPrice) * 100).toFixed(2);

            // Notify via Telegram
            const signalEmoji = signal === 'STRONG_BUY' ? '🔥 شراء قوي' : '🟢 شراء';
            const message = `
🆕 <b>توصية مضاربة لحظية جديدة!</b> 🚀

💎 سهم: <b>${symbol}</b> (${analysis.quote.nameAr || symbol})
📊 الإشارة: <b>${signalEmoji}</b>
💵 سعر الدخول المقترح: <code>${entryPrice} ج.م</code>

🎯 <b>الأهداف:</b>
• هدف 1: <code>${tp1} ج.م</code> (+${tp1Percent}%)
• هدف 2: <code>${tp2} ج.م</code> (+${tp2Percent}%)
• هدف 3: <code>${tp3} ج.م</code> (+${tp3Percent}%)

📉 وقف الخسارة: <code>${stopLossPrice} ج.م</code> (${slPercent}%)
⚖️ نسبة العائد للمخاطرة: <b>${analysis.riskRewardRatio || 'N/A'}</b>
💼 النسبة المقترحة من المحفظة: <b>${analysis.positionSizePercent}%</b>

💡 <b>أسباب التوصية اللحظية:</b>
${analysis.intradayReasons?.map((r) => `• ${r}`).join('\n') || '• زخم تداول إيجابي'}
`.trim();
            await telegramBot.broadcastRawMessage(message);
          }
        }
      }
    }

    if (updated) {
      this.saveTrades();
    }
  }
}
