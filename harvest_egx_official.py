import asyncio
import json
import os
import sys
from playwright.async_api import async_playwright

async def harvest():
    print(">>> [EGX Harvester] Launching Chromium...")
    all_stocks = []
    
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

        async def handle_response(response):
            if "market-watch" in response.url and "api" in response.url:
                try:
                    text = await response.text()
                    if "Request Rejected" not in text and text.strip().startswith("{"):
                        data = json.loads(text)
                        items = data.get("data", {}).get("data", []) or data.get("data", [])
                        if items:
                            all_stocks.extend(items)
                            print("  [Intercepted]: " + str(len(items)) + " stocks (Total: " + str(len(all_stocks)) + ")")
                except Exception as e:
                    pass

        page.on("response", handle_response)

        print("  Visiting landing page...")
        await page.goto("https://beta.egx.com.eg/en/market/market-watch", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)

        # Look for pagination buttons and click through all pages
        print("  Paginating through UI pages...")
        for p_idx in range(2, 12):
            try:
                next_btn = await page.query_selector('button[aria-label="Go to next page"], button:has-text("Next"), .pagination button:last-child, button[title="Next page"]')
                if not next_btn:
                    next_btn = await page.query_selector(f'button:has-text("{p_idx}")')
                
                if next_btn:
                    await next_btn.click()
                    await asyncio.sleep(1.5)
                else:
                    print("  No more pagination buttons found after page " + str(p_idx - 1))
                    break
            except Exception as e:
                print("  Pagination click error:", e)
                break

        await asyncio.sleep(2)
        await browser.close()

    # Deduplicate by reuters / isin
    unique_stocks = {}
    for s in all_stocks:
        key = (s.get("reuters") or s.get("isin") or s.get("name") or "").replace(".CA", "").upper()
        if key and key not in unique_stocks:
            unique_stocks[key] = s

    result_list = list(unique_stocks.values())
    print("Total unique EGX stocks harvested: " + str(len(result_list)))

    # Output to both data/ and frontend/data/
    possible_outputs = [
        os.path.join(os.getcwd(), "data", "egx-live.json"),
        os.path.join(os.getcwd(), "frontend", "data", "egx-live.json"),
        "/home/azureuser/egx-stock-bot/data/egx-live.json"
    ]

    for output_path in possible_outputs:
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(result_list, f, ensure_ascii=False, indent=2)
            print("Successfully written to " + output_path + " (File size: " + str(os.path.getsize(output_path)) + " bytes)")
        except Exception as e:
            pass

    if result_list:
        print("Sample stock 1: " + str(result_list[0].get("reuters")) + " - " + str(result_list[0].get("nameA")) + " (" + str(result_list[0].get("closePrice")) + " EGP)")

if __name__ == "__main__":
    asyncio.run(harvest())
