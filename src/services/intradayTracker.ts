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

  public async trackAndCheck(
    analyses: StockAnalysisResult[],
    telegramBot: TelegramBotService
  ): Promise<void> {
    const now = new Date().toISOString();
    let updated = false;

    for (const analysis of analyses) {
      const symbol = analysis.quote.symbol;
      const currentPrice = analysis.quote.currentPrice;
      const openTrade = this.getOpenTradeBySymbol(symbol);

      if (openTrade) {
        // Track the current price against open trade levels
        const targetHit = currentPrice >= openTrade.targetPrice;
        const stopLossHit = currentPrice <= openTrade.stopLossPrice;

        if (targetHit || stopLossHit) {
          openTrade.closePrice = currentPrice;
          openTrade.closeTime = now;
          openTrade.pnlPercentage = Number((((currentPrice - openTrade.entryPrice) / openTrade.entryPrice) * 100).toFixed(2));
          
          if (targetHit) {
            openTrade.status = 'CLOSED_TARGET_HIT';
            updated = true;
            logger.info(`🎯 [Intraday] Target Hit for ${symbol}: Price ${currentPrice} >= Target ${openTrade.targetPrice}`);

            // Notify via Telegram
            const message = `
🎯 <b>تم تحقيق الهدف اللحظي لـ ${symbol}!</b> 🟢

💰 سهم: <b>${symbol}</b> (${analysis.quote.nameAr || symbol})
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
            updated = true;
            logger.info(`🚨 [Intraday] Stop Loss Hit for ${symbol}: Price ${currentPrice} <= Stop Loss ${openTrade.stopLossPrice}`);

            // Notify via Telegram
            const message = `
🚨 <b>تم تفعيل وقف الخسارة اللحظي لـ ${symbol}!</b> 🔴

📉 سهم: <b>${symbol}</b> (${analysis.quote.nameAr || symbol})
💵 سعر الدخول: <code>${openTrade.entryPrice} ج.م</code>
💔 سعر الإغلاق: <code>${currentPrice} ج.م</code>
🎯 الهدف المفقود: <code>${openTrade.targetPrice} ج.م</code>
📉 وقف الخسارة: <code>${openTrade.stopLossPrice} ج.م</code>
📊 نسبة الخسارة: <b>${openTrade.pnlPercentage}%</b> 📉
⏰ وقت التوصية: <i>${new Date(openTrade.entryTime).toLocaleString('ar-EG')}</i>
`.trim();
            await telegramBot.broadcastRawMessage(message);
          }
        }
      } else {
        // No open trade, check if we should create a new recommendation
        const signal = analysis.intradaySignal;
        const entryPrice = analysis.intradayEntry || currentPrice;
        const targetPrice = analysis.intradayTarget;
        const stopLossPrice = analysis.intradayStopLoss;

        if ((signal === 'BUY' || signal === 'STRONG_BUY') && targetPrice && stopLossPrice) {
          // Check for cooldown to avoid immediate reopening of recently closed trades for the same ticker
          const recentClosedTrades = this.trades.filter(
            (t) => t.symbol.toUpperCase() === symbol.toUpperCase() && 
                   t.status !== 'OPEN' && 
                   (Date.now() - new Date(t.closeTime || '').getTime() < 4 * 60 * 60 * 1000) // 4 hours cooldown
          );

          if (recentClosedTrades.length === 0) {
            const newTrade: IntradayTrade = {
              id: `${symbol}_${Date.now()}`,
              symbol,
              recommendationType: signal,
              entryPrice,
              targetPrice,
              stopLossPrice,
              entryTime: now,
              status: 'OPEN'
            };

            this.trades.push(newTrade);
            updated = true;
            logger.info(`🆕 [Intraday] Opened new trade recommendation for ${symbol} @ ${entryPrice}`);

            // Notify via Telegram
            const signalEmoji = signal === 'STRONG_BUY' ? '🔥 شراء قوي' : '🟢 شراء';
            const message = `
🆕 <b>توصية مضاربة لحظية جديدة!</b> 🚀

💎 سهم: <b>${symbol}</b> (${analysis.quote.nameAr || symbol})
📊 الإشارة: <b>${signalEmoji}</b>
💵 سعر الدخول المقترح: <code>${entryPrice} ج.m</code>
🎯 الهدف اللحظي: <code>${targetPrice} ج.م</code>
📉 وقف الخسارة: <code>${stopLossPrice} ج.م</code>
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
