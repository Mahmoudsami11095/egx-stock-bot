import asyncio
import json
from playwright.async_api import async_playwright

async def inspect_stockastic():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        async def handle_response(response):
            url = response.url
            if any(k in url for k in ["financial", "statement", "income", "analysis", "r2", "api", "supabase", "json"]):
                try:
                    text = await response.text()
                    if len(text) < 1000 and "{" in text:
                        print(f"[API URL]: {url} -> {text[:150]}")
                    elif "3,39" in text or "3390" in text or "12.06" in text or "12,06" in text:
                        print(f"[FOUND MATCH IN URL]: {url} (len: {len(text)})")
                        with open("stockastic_matched_payload.json", "w", encoding="utf-8") as f:
                            f.write(text)
                except Exception:
                    pass

        page.on("response", handle_response)
        print("Visiting MASR page on Stockastic...")
        await page.goto("https://stockastic.app/ar/company/MASR.EGX", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect_stockastic())
