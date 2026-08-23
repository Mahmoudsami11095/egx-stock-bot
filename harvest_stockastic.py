import asyncio
import json
import os
import sys
import re
from playwright.async_api import async_playwright

PRIMARY_EGX_SYMBOLS = [
    'MASR', 'ORAS', 'ORHD', 'OIH', 'ORWE', 'COMI', 'SWDY', 'TMGH', 'FWRY',
    'ABUK', 'EGAL', 'EGAS', 'CLHO', 'ETEL', 'AMOC', 'MFPC', 'SKPC', 'EKHO',
    'EKHOA', 'HELI', 'HRHO', 'AUTO', 'JUFO', 'DOMT', 'OBRI', 'EFID', 'RMDA',
    'ISPH', 'CICH', 'PHDC', 'MNHD', 'OCDI', 'BTFH', 'CCAP', 'RAYA', 'ALCN',
    'ADIB', 'CIEB', 'HDBK', 'FAIT', 'QNBA'
]

async def parse_number(text):
    if not text:
        return None
    cleaned = text.replace(',', '').replace(' ', '').strip()
    match = re.search(r'[-+]?\d*\.?\d+', cleaned)
    if not match:
        return None
    val = float(match.group())
    if 'مليار' in text or 'B' in text or 'b' in text:
        val *= 1e9
    elif 'مليون' in text or 'M' in text or 'm' in text:
        val *= 1e6
    elif 'ألف' in text or 'K' in text or 'k' in text:
        val *= 1e3
    return val

async def harvest():
    print(">>> [Stockastic Harvester] Launching Chromium...")
    results = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        for sym in PRIMARY_EGX_SYMBOLS:
            try:
                print(f"  [Stockastic] Harvesting {sym}...")
                url = f"https://stockastic.app/ar/company/{sym}.EGX"
                
                # Navigate to company page
                await page.goto(url, wait_until="domcontentloaded", timeout=25000)
                await asyncio.sleep(2)

                # Look for financial statements / income table
                # Check for LTM values or parse page text
                body_text = await page.inner_text("body")
                
                currency = 'USD' if sym == 'ORAS' else 'EGP'

                # Extract Net Income, Revenue, Gross Profit from page if available
                # Fallback to default calculated structure
                net_income = None
                revenue = None
                gross_profit = None
                eps = None
                pe_ratio = None
                period = 'آخر 12 شهرًا LTM 2026 (Stockastic)'

                # Match patterns from the Income Statement table
                # e.g. "صافي الربح للفترة" or "الإيرادات" or "مجمل الربح"
                lines = [line.strip() for line in body_text.split('\n') if line.strip()]
                
                for idx, line in enumerate(lines):
                    if "صافي الربح" in line and idx + 1 < len(lines):
                        val = await parse_number(lines[idx + 1])
                        if val is not None and net_income is None:
                            net_income = val
                    if "الإيرادات" in line and idx + 1 < len(lines):
                        val = await parse_number(lines[idx + 1])
                        if val is not None and revenue is None:
                            revenue = val
                    if "مجمل الربح" in line and idx + 1 < len(lines):
                        val = await parse_number(lines[idx + 1])
                        if val is not None and gross_profit is None:
                            gross_profit = val
                    if "ربحية السهم" in line and idx + 1 < len(lines):
                        val = await parse_number(lines[idx + 1])
                        if val is not None and eps is None:
                            eps = val

                results[sym] = {
                    "symbol": sym,
                    "netIncome": net_income,
                    "revenue": revenue,
                    "grossProfit": gross_profit,
                    "eps": eps,
                    "peRatio": pe_ratio,
                    "period": period,
                    "currency": currency
                }
                print(f"    ✓ {sym} parsed: NetIncome={net_income}, Revenue={revenue}")
            except Exception as e:
                print(f"    ⚠️ Error harvesting {sym}: {e}")

        await browser.close()

    # Save to data directories
    possible_outputs = [
        os.path.join(os.getcwd(), "data", "stockastic-live.json"),
        os.path.join(os.getcwd(), "frontend", "data", "stockastic-live.json"),
        "/home/azureuser/egx-stock-bot/data/stockastic-live.json"
    ]

    for output_path in possible_outputs:
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"Successfully written to {output_path} (Items: {len(results)})")
        except Exception as e:
            pass

if __name__ == "__main__":
    asyncio.run(harvest())
