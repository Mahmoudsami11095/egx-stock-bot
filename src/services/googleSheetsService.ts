import https from 'https';
import { StockAnalysisResult } from '../types/stock';
import { config } from '../config/environment';
import { logger } from './logger';

export class GoogleSheetsService {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl =
      config.googleSheetsWebhookUrl ||
      'https://script.google.com/macros/s/AKfycbz7QaHLl3lQhPfYdyjQG6ZAc1e0C3bNj7O7XXn5caUFPknyvOaEE7wdtn_1sDxV7bAJ/exec';
  }

  /**
   * Automatically pushes live stock analysis data to user's Google Sheet (17anSf-cjckoBaV3jhBD5IscwxONGKu79W3ekTSq8lck).
   */
  public async syncToGoogleSheet(analyses: StockAnalysisResult[]): Promise<boolean> {
    const urlStr = this.webhookUrl;
    if (!urlStr) {
      logger.info('ℹ️ Google Sheets Webhook URL not set. Skipping live Google Sheets push sync.');
      return false;
    }

    const sorted = [...analyses].sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);

    const payload = JSON.stringify({
      sheetId: '17anSf-cjckoBaV3jhBD5IscwxONGKu79W3ekTSq8lck',
      timestamp: new Date().toLocaleString('ar-EG'),
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
    });

    return new Promise((resolve) => {
      try {
        const u = new URL(urlStr);
        const options = {
          hostname: u.hostname,
          port: 443,
          path: u.pathname + u.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        };

        const req = https.request(options, (res) => {
          if (res.statusCode === 302 || res.statusCode === 301) {
            const redirectUrl = res.headers.location;
            if (redirectUrl) {
              https.get(redirectUrl, (res2) => {
                let body = '';
                res2.on('data', (chunk) => (body += chunk));
                res2.on('end', () => {
                  logger.info(`✅ Google Sheets live sync complete! Response: ${body}`);
                  resolve(true);
                });
              });
              return;
            }
          }

          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            logger.info(`✅ Google Sheets live sync response: ${body}`);
            resolve(true);
          });
        });

        req.on('error', (err) => {
          logger.error(`Error syncing to Google Sheet: ${err.message}`);
          resolve(false);
        });

        req.write(payload);
        req.end();
      } catch (err) {
        logger.error(`Failed to trigger Google Sheet sync: ${err}`);
        resolve(false);
      }
    });
  }
}
