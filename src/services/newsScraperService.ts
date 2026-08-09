import Parser from 'rss-parser';
import { logger } from './logger';

export interface NewsSnippet {
  title: string;
  link: string;
  pubDate: string;
  snippet: string;
}

export class NewsScraperService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  /**
   * Fetches recent news for a specific EGX stock from Google News.
   * Targets Arabic financial keywords to find earnings/results.
   */
  public async fetchRecentFinancialNews(stockNameAr: string): Promise<NewsSnippet[]> {
    try {
      // Build Google News RSS query focusing on stock name + financial keywords + recency (within last year)
      const query = `"${stockNameAr}" (أرباح OR "صافي الربح" OR "نتائج أعمال" OR إيرادات) when:1y`;
      const encodedQuery = encodeURIComponent(query);
      const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ar&gl=EG&ceid=EG:ar`;

      logger.info(`📰 [NewsScraper] Fetching recent news for: ${stockNameAr}`);
      const feed = await this.parser.parseURL(url);

      const items = feed.items || [];
      // Sort by publication date descending (newest first)
      items.sort((a, b) => {
        const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return dateB - dateA;
      });

      // Return top 5 newest news snippets
      return items.slice(0, 5).map(item => ({
        title: item.title || '',
        link: item.link || '',
        pubDate: item.pubDate || '',
        snippet: item.contentSnippet || item.title || ''
      }));
    } catch (error) {
      logger.error(`❌ [NewsScraper] Error fetching news for ${stockNameAr}: ${error}`);
      return [];
    }
  }
}
