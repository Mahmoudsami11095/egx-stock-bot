import { Telegraf } from 'telegraf';
import { config } from '../config/environment';
import { StateManager } from '../services/stateManager';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { setupCommands } from './commands';
import { StockAnalysisResult } from '../types/stock';
import { formatSignalCard } from './templates';
import { logger } from '../services/logger';

export class TelegramBotService {
  public bot: Telegraf | null = null;

  constructor(
    private stateManager: StateManager,
    private dataFetcher: DataFetcherService,
    private signalDetector: SignalDetectorService
  ) {
    if (config.telegramBotToken) {
      this.bot = new Telegraf(config.telegramBotToken);
      setupCommands(this.bot, this.stateManager, this.dataFetcher, this.signalDetector);
    }
  }

  public async start(): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.launch();
      logger.info('🤖 Telegram Bot launched successfully!');
    } catch (error) { logger.error(`Failed to launch Telegram Bot: ${error}`); }
  }

  public async broadcastNotificationCard(analysis: StockAnalysisResult): Promise<void> {
    if (!this.bot) return;

    const subscribers = this.stateManager.getSubscribers();
    if (config.telegramChatId && !subscribers.includes(config.telegramChatId)) {
      subscribers.push(config.telegramChatId);
    }

    if (subscribers.length === 0) {
      logger.info(`[Signal Alert] (${analysis.signalType}) for ${analysis.quote.symbol}: ${analysis.quote.currentPrice} EGP (No active subscribers yet).`);
      return;
    }

    const htmlCard = formatSignalCard(analysis);

    for (const chatId of subscribers) {
      try {
        await this.bot.telegram.sendMessage(chatId, htmlCard, { parse_mode: 'HTML' });
        logger.info(`✅ Push Alert sent to Chat ID (${chatId}) for ${analysis.quote.symbol} (${analysis.signalType}).`);
      } catch (error) {
        logger.error(`Failed to send Telegram alert to ${chatId}: ${error}`);
      }
    }
  }

  public async sendNotificationCard(analysis: StockAnalysisResult, chatId?: string): Promise<boolean> {
    await this.broadcastNotificationCard(analysis);
    return true;
  }

  public stop(reason: string): void { if (this.bot) this.bot.stop(reason); }
}
