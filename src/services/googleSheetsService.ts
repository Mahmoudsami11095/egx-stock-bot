import http from 'https';
import https from 'https';
import { StockAnalysisResult } from '../types/stock';
import { config } from '../config/environment';
import { logger } from './logger';

export class GoogleSheetsService {
  private webhookUrl: string | undefined;

  constructor() {
    this.webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  }

  /**
   * Automatically pushes live stock analysis data to user's Google Sheet (17anSf-cjckoBaV3jhBD5IscwxONGKu79W3ekTSq8lck).
   */
  public async syncToGoogleSheet(analyses: StockAnalysisResult[]): Promise<boolean> {
    if (!this.webhookUrl) {
      logger.info('ℹ️ Google Sheets Webhook URL not set. Skipping live Google Sheets push sync.');
      return false;
    }

    const sorted = [...analyses].sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);

    const payload = {
      sheetId: '17anSf-cjckoBaV3jhBD5IscwxONGKu79W3ekTSq8lck',
      timestamp: new Date().toISOString(),
      stocks: sorted.map((a) => ({
        symbol: a.quote.symbol,
        nameAr: a.quote.nameAr,
        currentPrice: a.quote.currentPrice,
        changePercent: a.quote.changePercent,
        fairValue: a.fairValue,
        fairValueUpsidePercent: a.fairValueUpsidePercent,
        signalType: a.signalType,
        rsi: a.indicators.rsi,
        sma20: a.indicators.sma20,
        sma50: a.indicators.sma50,
        support: a.indicators.support,
        resistance: a.indicators.resistance,
        entryMin: a.suggestedEntry.min,
        entryMax: a.suggestedEntry.max,
        target1: a.suggestedTarget.target1,
        target2: a.suggestedTarget.target2,
        stopLoss: a.suggestedStopLoss,
        shariaStatus: 'Halal - Sharia Compliant'
      }))
    };

    return new Promise((resolve) => {
      try {
        const postData = JSON.stringify(payload);
        const url = new URL(this.webhookUrl!);

        const options = {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const client = url.protocol === 'https:' ? https : http;
        const req = client.request(options, (res) => {
          logger.info(`✅ Google Sheets sync HTTP Status: ${res.statusCode}`);
          resolve(true);
        });

        req.on('error', (err) => {
          logger.error(`Error syncing to Google Sheet: ${err.message}`);
          resolve(false);
        });

        req.write(postData);
        req.end();
      } catch (err) {
        logger.error(`Failed to trigger Google Sheet sync: ${err}`);
        resolve(false);
      }
    });
  }
}
