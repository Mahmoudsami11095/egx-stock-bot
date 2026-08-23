import { Client } from 'ssh2';

const conn = new Client();

console.log('📡 Connecting via SSH to Azure VM to test Playwright Stealth against Investing.com...');

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['azureuserSami@11095']);
});

conn.on('ready', () => {
  console.log('✅ SSH Connection established!');
  
  const script = `
cd /home/azureuser/test_impersonate

cat << 'EOF' > test_investing_stealth.py
import asyncio
import json
import os
from playwright.async_api import async_playwright

async def test_investing():
    print(">>> Launching Chromium with Stealth Flags for Investing.com...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080'
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="ar-EG",
            viewport={"width": 1920, "height": 1080}
        )
        page = await context.new_page()

        # Inject stealth evasions
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['ar-EG', 'ar', 'en-US', 'en'] });
            window.chrome = { runtime: {} };
        """)

        # Navigate to Arabic Investing Egypt equities
        url = "https://sa.investing.com/equities/egypt"
        print(f"Navigating to {url}...")
        try:
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            print(f"Response status: {resp.status if resp else 'None'}")
            
            # Allow time for Cloudflare to verify and page to render table
            await asyncio.sleep(6)
            title = await page.title()
            print("Page Title:", title)

            # Evaluate table rows
            stocks = await page.evaluate('''() => {
                const results = [];
                const rows = document.querySelectorAll('table tbody tr');
                rows.forEach(tr => {
                    const link = tr.querySelector('td a');
                    const name = link ? link.innerText.trim() : '';
                    const href = link ? link.getAttribute('href') : '';
                    const tds = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
                    if (name && tds.length >= 6) {
                        results.push({ name, href, last: tds[2], high: tds[3], low: tds[4], chg: tds[5], chgPct: tds[6], vol: tds[7] });
                    }
                });
                return results;
            }''')

            print(f"Total stocks extracted from Investing.com: {len(stocks)}")
            if stocks:
                print("Sample stock 1:", json.dumps(stocks[0], ensure_ascii=False))
                if len(stocks) > 1:
                    print("Sample stock 2:", json.dumps(stocks[1], ensure_ascii=False))

                # Save snapshot
                out_file = "/home/azureuser/egx-stock-bot/data/investing-live.json"
                os.makedirs(os.path.dirname(out_file), exist_ok=True)
                with open(out_file, "w", encoding="utf-8") as f:
                    json.dump(stocks, f, ensure_ascii=False, indent=2)
                print("Saved snapshot to", out_file)

        except Exception as e:
            print("Error during stealth crawl:", e)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_investing())
EOF

./venv/bin/python3 test_investing_stealth.py
`;

  conn.exec(script, (err, stream) => {
    if (err) {
      console.error('❌ Execution error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code: number) => {
      console.log(`\n🏁 Stealth test finished with exit code ${code}!`);
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
