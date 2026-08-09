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

/** Comparison markers — numbers after these refer to prior periods and must be ignored. */
const COMPARISON_SPLIT_RE = /\s*(?:مقابل|مقارنة\s*بـ|مقارنة\s*مع|عن\s+العام\s+السابق|في\s+العام\s+السابق|عن\s+نفس\s+الفترة\s+من\s+العام\s+السابق)\s*/i;

/** Numbers immediately preceded by a comparison preposition (within ~30 chars). */
const COMPARISON_PREFIX_RE = /(?:مقابل|مقارنة\s*ب(?:ـ|)?|عن\s+العام\s+السابق|في\s+(?:العام\s+)?(?:السابق|\d{4}))\s*[:\-]?\s*$/i;

const PROFIT_VERB_PREFIX = '(?:إلى|تسجل|بلغت|تحقق|بـ|عند|تصل|سجلت|أرباح|صافي\\s+أ?رباح?)';

/**
 * Returns the portion of the headline that describes the current reporting period,
 * stripping trailing prior-year comparison clauses.
 */
export function stripComparisonSegments(title: string): string {
  return title.split(COMPARISON_SPLIT_RE)[0].trim();
}

/**
 * Extracts the first billion/million EGP figure from text, skipping comparison-context numbers.
 */
export function extractCurrentPeriodProfit(title: string): number | null {
  const currentSegment = stripComparisonSegments(title);

  const billionPatterns = [
    new RegExp(`${PROFIT_VERB_PREFIX}\\s+([0-9]+(?:\\.[0-9]+)?)\\s*مليار`, 'i'),
    /([0-9]+(?:\.[0-9]+)?)\s*مليار\s*جنيه/i,
    /([0-9]+(?:\.[0-9]+)?)\s*مليار(?!\s*(?:مقابل|في\s+\d{4}))/i,
  ];

  const millionPatterns = [
    new RegExp(`${PROFIT_VERB_PREFIX}\\s+([0-9]+(?:\\.[0-9]+)?)\\s*مليون`, 'i'),
    /([0-9]+(?:\.[0-9]+)?)\s*مليون\s*جنيه/i,
    /([0-9]+(?:\.[0-9]+)?)\s*مليون(?!\s*(?:مقابل|في\s+\d{4}))/i,
  ];

  for (const pattern of billionPatterns) {
    const match = currentSegment.match(pattern);
    if (match) {
      const prefix = currentSegment.slice(0, match.index ?? 0);
      if (!COMPARISON_PREFIX_RE.test(prefix.slice(-40))) {
        return parseFloat(match[1]) * 1_000_000_000;
      }
    }
  }

  for (const pattern of millionPatterns) {
    const match = currentSegment.match(pattern);
    if (match) {
      const prefix = currentSegment.slice(0, match.index ?? 0);
      if (!COMPARISON_PREFIX_RE.test(prefix.slice(-40))) {
        return parseFloat(match[1]) * 1_000_000;
      }
    }
  }

  return null;
}

/**
 * Parses Arabic financial earnings headlines automatically.
 * Handles patterns like:
 * - "أرباح مصر للألومنيوم تنمو 6% إلى 10.4 مليار جنيه خلال 9 أشهر"
 * - "أرباح السويدي إليكتريك ترتفع إلى 3.5 مليار جنيه في الربع الأول"
 * - "صافي أرباح طاقة عربية يصل إلى 540 مليون جنيه خلال 6 أشهر"
 * - "أرباح 1.138 مليار مقابل 2.539 مليار في 2024" → extracts 1.138B (not 2.539B)
 */
export function parseArabicFinancialHeadline(symbol: string, title: string, pubDate: string): AutomatedParsedEarnings | null {
  if (!title) return null;

  const isEarningsNews = /(أرباح|أرباحها|صافي|أرباحاً|نتائج|ربحية)/.test(title);
  if (!isEarningsNews) return null;

  let periodMonths = 12;

  if (/(9 أشهر|تسعة أشهر|الربع الثالث)/.test(title)) {
    periodMonths = 9;
  } else if (/(النصف الأول|6 أشهر|ستة أشهر|الربع الثاني)/.test(title)) {
    periodMonths = 6;
  } else if (/(الربع الأول|3 أشهر|ثلاثة أشهر)/.test(title)) {
    periodMonths = 3;
  } else if (/(الربع الرابع|سنوية|عام كامل|خلال عام)/.test(title)) {
    periodMonths = 12;
  }

  const netProfit = extractCurrentPeriodProfit(title);
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

interface RssItem {
  title: string;
  pubDate: string;
}

function parseRssItems(body: string): RssItem[] {
  const items = body.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map(item => ({
    title: (item.match(/<title>(.*?)<\/title>/) || [])[1] || '',
    pubDate: (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '',
  }));
}

/**
 * Live Automated Scraper for EGX Earnings via RSS.
 * Automatically queries Google News for Arabic earnings announcements for a specific stock.
 */
export function fetchAutomatedEarningsFromRss(stockNameAr: string, symbol: string): Promise<AutomatedParsedEarnings | null> {
  return new Promise((resolve) => {
    const query = `"${stockNameAr}" (أرباح OR أرباحها OR صافي OR "نتائج أعمال") when:1y`;
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
          const items = parseRssItems(body);
          items.sort((a, b) => {
            const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
            const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
            return dateB - dateA;
          });

          for (const { title, pubDate } of items) {
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
