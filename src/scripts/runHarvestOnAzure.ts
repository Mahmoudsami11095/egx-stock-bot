import { Client } from 'ssh2';

const conn = new Client();

console.log('📡 Connecting via SSH to Azure VM (20.91.240.54) to paginate via UI/intercept on EGX Beta...');

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['azureuserSami@11095']);
});

conn.on('ready', () => {
  console.log('✅ SSH Connection established!');
  
  const script = `
cd /home/azureuser/egx-stock-bot
mkdir -p data

cat << 'EOF' > /home/azureuser/egx-stock-bot/harvest_egx_official.py
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
                # Click next page or page number button
                next_btn = await page.query_selector('button[aria-label="Go to next page"], button:has-text("Next"), .pagination button:last-child, button[title="Next page"]')
                if not next_btn:
                    # Try finding button with page number
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

    output_path = "/home/azureuser/egx-stock-bot/data/egx-live.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result_list, f, ensure_ascii=False, indent=2)

    print("Successfully written to " + output_path + " (File size: " + str(os.path.getsize(output_path)) + " bytes)")
    if result_list:
        print("Sample stock 1: " + str(result_list[0].get("reuters")) + " - " + str(result_list[0].get("nameA")) + " (" + str(result_list[0].get("closePrice")) + " EGP)")

if __name__ == "__main__":
    asyncio.run(harvest())
EOF

/home/azureuser/test_impersonate/venv/bin/python3 /home/azureuser/egx-stock-bot/harvest_egx_official.py
`;

  conn.exec(script, (err, stream) => {
    if (err) {
      console.error('❌ Execution error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code: number) => {
      console.log(`\n🎉 UI Paginator Harvester finished with exit code ${code}!`);
      conn.end();
    }).on('data', (data: Buffer) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data: Buffer) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('❌ SSH Connection Error:', err.message);
}).connect({
  host: '20.91.240.54',
  port: 2222,
  username: 'azureuser',
  password: 'azureuserSami@11095',
  tryKeyboard: true,
  readyTimeout: 30000,
  keepaliveInterval: 5000
});
