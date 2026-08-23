import { Client } from 'ssh2';

const conn = new Client();

console.log('📡 Connecting via SSH to Azure VM (20.91.240.54) to execute Playwright test against EGX Beta...');

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['azureuserSami@11095']);
});

conn.on('ready', () => {
  console.log('✅ SSH Connection established!');
  
  const script = `
cd /home/azureuser/test_impersonate

cat << 'EOF' > test_playwright_direct.py
import asyncio
import json
from playwright.async_api import async_playwright

async def main():
    print(">>> Starting Playwright Chromium instance...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        captured_records = []

        async def handle_response(response):
            if "market-watch" in response.url and "api" in response.url:
                print(f"[Intercepted URL]: {response.url} | Status: {response.status}")
                try:
                    text = await response.text()
                    if "Request Rejected" not in text:
                        data = json.loads(text)
                        items = data.get("data", {}).get("data", []) or data.get("data", [])
                        captured_records.extend(items)
                        print(f"🎉 SUCCESS! Captured {len(items)} real stock records from EGX Beta API!")
                    else:
                        print("❌ Intercepted response was 'Request Rejected'")
                except Exception as e:
                    print("Error parsing response:", e)

        page.on("response", handle_response)

        print("Navigating to https://beta.egx.com.eg/en/market/market-watch...")
        await page.goto("https://beta.egx.com.eg/en/market/market-watch", wait_until="networkidle", timeout=30000)
        await asyncio.sleep(4)

        print("Page Title:", await page.title())
        print(f"Total Captured Stocks: {len(captured_records)}")
        if captured_records:
            print("First Stock Sample:", json.dumps(captured_records[0], ensure_ascii=False))

        await browser.close()

asyncio.run(main())
EOF

./venv/bin/python3 test_playwright_direct.py
`;

  conn.exec(script, (err, stream) => {
    if (err) {
      console.error('❌ Execution error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code: number) => {
      console.log(`\n🏁 Playwright run finished with exit code ${code}!`);
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
