import fs from 'fs';
import path from 'path';
import { StockAnalysisResult } from '../types/stock';
import { logger } from './logger';

export class ExportService {
  private dataDir = path.join(process.cwd(), 'data');

  constructor() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Generates a CSV file containing full technical analysis, fair values, targets, and Sharia status.
   */
  public generateCsv(analyses: StockAnalysisResult[]): string {
    const filePath = path.join(this.dataDir, 'EGX_Halal_Stocks_Analysis.csv');

    // Header row
    const headers = [
      'Symbol',
      'Name Arabic',
      'Current Price (EGP)',
      'Change %',
      'Fair Value (EGP)',
      'Fair Value Upside %',
      'Signal',
      'RSI (14)',
      'SMA20',
      'SMA50',
      'Support (EGP)',
      'Resistance (EGP)',
      'Entry Zone Min (EGP)',
      'Entry Zone Max (EGP)',
      'Target 1 (EGP)',
      'Target 2 - Fair Value (EGP)',
      'Stop Loss (EGP)',
      'Sharia Status',
      'Last Update Time'
    ];

    const sorted = [...analyses].sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);

    const rows = sorted.map((a) => [
      a.quote.symbol,
      `"${a.quote.nameAr.replace(/"/g, '""')}"`,
      a.quote.currentPrice,
      a.quote.changePercent,
      a.fairValue,
      a.fairValueUpsidePercent,
      a.signalType,
      a.indicators.rsi,
      a.indicators.sma20,
      a.indicators.sma50,
      a.indicators.support,
      a.indicators.resistance,
      a.suggestedEntry.min,
      a.suggestedEntry.max,
      a.suggestedTarget.target1,
      a.suggestedTarget.target2,
      a.suggestedStopLoss,
      'Halal - Sharia Compliant',
      new Date().toLocaleString('ar-EG')
    ]);

    // UTF-8 BOM for Excel Arabic character compatibility
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    fs.writeFileSync(filePath, csvContent, 'utf8');
    logger.info(`📊 Generated updated CSV Sheet at ${filePath}`);
    return filePath;
  }
}
