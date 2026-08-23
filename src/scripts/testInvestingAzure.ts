import { Client } from 'ssh2';

const conn = new Client();

console.log('📡 Connecting via SSH to Azure VM to diagnose Investing.com Cloudflare challenge...');

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['azureuserSami@11095']);
});

conn.on('ready', () => {
  console.log('✅ SSH Connection established!');
  
  const script = `
cd /home/azureuser/test_impersonate

cat << 'EOF' > test_investing_debug.py
import asyncio
import json
from playwright.async_api import async_playwright

async def test_investing():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            locale="en-US"
        )
        page = await context.new_page()

        url = "https://www.investing.com/equities/egypt"
        print("Navigating to " + url + "...")
        resp = await page.goto(url, wait_until="networkidle", timeout=30000)
        print("Response status: " + str(resp.status if resp else 'None'))
        print("Final URL: " + page.url)
        print("Page Title: " + str(await page.title()))
        
        content = await page.content()
        if "cf-turnstile" in content or "challenge-platform" in content or "Just a moment" in content:
            print("❌ Hard Cloudflare Turnstile Bot Wall active on Investing.com!")
        else:
            print("✅ Loaded without Cloudflare block!")
            # Try finding rows
            rows = await page.query_selector_all('table tr')
            print("Total table rows found: " + str(len(rows)))

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_investing())
EOF

./venv/bin/python3 test_investing_debug.py
`;

  conn.exec(script, (err, stream) => {
    if (err) {
      console.error('❌ Execution error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code: number) => {
      console.log(`\n🏁 Debug finished with exit code ${code}!`);
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
