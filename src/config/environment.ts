import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  pollIntervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES || '5', 10),
  marketHoursOnly: process.env.MARKET_HOURS_ONLY === 'true',
  cronSchedule: process.env.CRON_SCHEDULE || '*/5 * * * *',
  nodeEnv: process.env.NODE_ENV || 'development',
};

if (!config.telegramBotToken || config.telegramBotToken.includes('YOUR_TELEGRAM_BOT_TOKEN')) {
  console.warn(
    '⚠️ Warning: TELEGRAM_BOT_TOKEN is missing or using placeholder in .env file. Please set your bot token from @BotFather.'
  );
}
