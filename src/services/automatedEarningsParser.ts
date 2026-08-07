import https from 'https';
import { logger } from './logger';

export interface AutomatedParsedEarnings {
  symbol: string;
  netProfit: number;
  periodMonths: number;
  annualizedNetProfit: number;
  headline: string;
  pubDate: string;
  source: string;
}

/**
 * Parses Arabic financial earnings headlines automatically.
 * Handles patterns like:
 * - "أرباح مصر للألومنيوم تنمو 6% إلى 10.4 مليار جنيه خلال 9 أشهر"
 * - "أرباح السويدي إليكتريك ترتفع إلى 3.5 مليار جنيه في الربع الأول"
 * - "صافي أرباح طاقة عربية يصل إلى 540 مليون جنيه خلال 6 أشهر"
 */
export function parseArabicFinancialHeadline(symbol: string, title: string, pubDate: string): AutomatedParsedEarnings | null {
  if (!title) return null;

  // Must contain earnings keywords
  const isEarningsNews = /(أرباح|أرباحها|صافي|أرباحاً|نتائج|ربحية)/.test(title);
  if (!isEarningsNews) return null;

  let periodMonths = 12; // default

  // Detect fiscal period
  if (/(9 أشهر|تسعة أشهر|الربع الثالث)/.test(title)) {
    periodMonths = 9;
  } else if (/(النصف الأول|6 أشهر|ستة أشهر|الربع الثاني)/.test(title)) {
    periodMonths = 6;
  } else if (/(الربع الأول|3 أشهر|ثلاثة أشهر)/.test(title)) {
    periodMonths = 3;
  } else if (/(الربع الرابع|سنوية|عام كامل|خلال عام)/.test(title)) {
    periodMonths = 12;
  }

  let netProfit: number | null = null;

  // Pattern 1: Billion EGP (e.g. "إلى 10.4 مليار", "تسجل 3.5 مليار", "بلغت 10.4 مليار")
  const billionMatch = title.match(/(?:إلى|تسجل|بلغت|تحقق|بـ|عند|تصل|سجلت)\s+([0-9]+(?:\.[0-9]+)?)\s*مليار/);
  // Pattern 2: Million EGP (e.g. "إلى 540 مليون", "تسجل 250 مليون")
  const millionMatch = title.match(/(?:إلى|تسجل|بلغت|تحقق|بـ|عند|تصل|سجلت)\s+([0-9]+(?:\.[0-9]+)?)\s*مليون/);

  if (billionMatch) {
    netProfit = parseFloat(billionMatch[1]) * 1_000_000_000;
  } else if (millionMatch) {
    netProfit = parseFloat(millionMatch[1]) * 1_000_000;
  }

  if (!netProfit || netProfit <= 0) return null;

  const annualizedNetProfit = netProfit * (12 / periodMonths);

  return {
    symbol: symbol.toUpperCase(),
    netProfit,
    periodMonths,
    annualizedNetProfit,
    headline: title,
    pubDate,
    source: 'Google News EGX Auto-Scraper'
  };
}

/**
 * Live Automated Scraper for EGX Earnings via RSS.
 * Automatically queries Google News for Arabic earnings announcements for a specific stock.
 */
export function fetchAutomatedEarningsFromRss(stockNameAr: string, symbol: string): Promise<AutomatedParsedEarnings | null> {
  return new Promise((resolve) => {
    const query = `"${stockNameAr}" (أرباح OR أرباحها OR صافي OR "نتائج أعمال")`;
    const encoded = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=ar&gl=EG&ceid=EG:ar`;

    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 5000
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          const items = body.match(/<item>[\s\S]*?<\/item>/g) || [];
          for (const item of items) {
            const titleMatch = item.match(/<title>(.*?)<\/title>/);
            const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
            const title = titleMatch ? titleMatch[1] : '';
            const pubDate = dateMatch ? dateMatch[1] : '';

            const parsed = parseArabicFinancialHeadline(symbol, title, pubDate);
            if (parsed) {
              resolve(parsed);
              return;
            }
          }
          resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}
