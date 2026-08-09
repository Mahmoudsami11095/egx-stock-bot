import { Telegraf } from 'telegraf';
import { config } from '../config/environment';
import { StateManager } from '../services/stateManager';
import { DataFetcherService } from '../services/dataFetcher';
import { SignalDetectorService } from '../services/signalDetector';
import { setupCommands } from './commands';
import { StockAnalysisResult } from '../types/stock';
import { formatSignalCard } from './templates';
import { logger } from '../services/logger';
import { IntradayTrackerService } from '../services/intradayTracker';

export class TelegramBotService {
  public bot: Telegraf | null = null;

  constructor(
    private stateManager: StateManager,
    private dataFetcher: DataFetcherService,
    private signalDetector: SignalDetectorService,
    private intradayTracker: IntradayTrackerService = new IntradayTrackerService()
  ) {
    if (config.telegramBotToken) {
      this.bot = new Telegraf(config.telegramBotToken);
      setupCommands(
        this.bot,
        this.stateManager,
        this.dataFetcher,
        this.signalDetector,
        undefined, // goldService
        undefined, // shariaService
        undefined, // exportService
        undefined, // googleSheetsService
        this.intradayTracker
      );
    }
  }

  public async start(): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.launch();
      logger.info('🤖 Telegram Bot launched successfully!');
    } catch (error) { logger.error(`Failed to launch Telegram Bot: ${error}`); }
  }

  public async sendDocumentToSubscribers(filePath: string, caption?: string): Promise<void> {
    if (!this.bot) return;

    const subscribers = this.stateManager.getSubscribers();
    if (config.telegramChatId && !subscribers.includes(config.telegramChatId)) {
      subscribers.push(config.telegramChatId);
    }

    for (const chatId of subscribers) {
      try {
        await this.bot.telegram.sendDocument(chatId, { source: filePath }, { caption });
        logger.info(`📄 Spreadsheet document sent to Chat ID (${chatId}).`);
      } catch (error) {
        logger.error(`Failed to send document to ${chatId}: ${error}`);
      }
    }
  }

  public async broadcastRawMessage(htmlMessage: string): Promise<void> {
    if (!this.bot) return;

    const subscribers = this.stateManager.getSubscribers();
    if (config.telegramChatId && !subscribers.includes(config.telegramChatId)) {
      subscribers.push(config.telegramChatId);
    }

    if (subscribers.length === 0) return;

    for (const chatId of subscribers) {
      try {
        await this.bot.telegram.sendMessage(chatId, htmlMessage, { parse_mode: 'HTML' });
        logger.info(`✅ Broadcast message sent to Chat ID (${chatId}).`);
      } catch (error) {
        logger.error(`Failed to send broadcast message to ${chatId}: ${error}`);
      }
    }
  }

  public async broadcastNotificationCard(analysis: StockAnalysisResult): Promise<void> {
    const htmlCard = formatSignalCard(analysis);
    await this.broadcastRawMessage(htmlCard);
  }

  public async sendNotificationCard(analysis: StockAnalysisResult, chatId?: string): Promise<boolean> {
    await this.broadcastNotificationCard(analysis);
    return true;
  }

  public stop(reason: string): void { if (this.bot) this.bot.stop(reason); }
}
