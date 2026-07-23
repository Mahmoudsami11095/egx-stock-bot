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
    if (config.telegramBotToken && !config.telegramBotToken.includes('YOUR_TELEGRAM_BOT_TOKEN')) {
      this.bot = new Telegraf(config.telegramBotToken);
      setupCommands(this.bot, this.stateManager, this.dataFetcher, this.signalDetector);
    } else {
      logger.warn('Telegram Bot token not set. Running in scan-only mode without Telegram connection.');
    }
  }

  public async start(): Promise<void> {
    if (!this.bot) return;

    try {
      await this.bot.launch();
      logger.info('🤖 Telegram Bot launched successfully and listening for user commands!');
    } catch (error) {
      logger.error(`Failed to launch Telegram Bot: ${error}`);
    }
  }

  public async sendNotificationCard(analysis: StockAnalysisResult, chatId?: string): Promise<boolean> {
    const targetChatId = chatId || config.telegramChatId;

    if (!this.bot || !targetChatId || targetChatId.includes('YOUR_TELEGRAM_CHAT_ID')) {
      logger.info(`[Alert Signal] (${analysis.signalType}) for ${analysis.quote.symbol}: ${analysis.quote.currentPrice} EGP (Skipping Telegram push: Chat ID not set).`);
      return false;
    }

    try {
      const htmlCard = formatSignalCard(analysis);
      await this.bot.telegram.sendMessage(targetChatId, htmlCard, { parse_mode: 'HTML' });
      logger.info(`✅ Alert push notification sent to Telegram for ${analysis.quote.symbol} (${analysis.signalType}).`);
      return true;
    } catch (error) {
      logger.error(`Failed to send Telegram alert for ${analysis.quote.symbol}: ${error}`);
      return false;
    }
  }

  public stop(reason: string): void {
    if (this.bot) {
      this.bot.stop(reason);
    }
  }
}
