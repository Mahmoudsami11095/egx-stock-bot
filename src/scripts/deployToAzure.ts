import { Client } from 'ssh2';

const conn = new Client();

console.log('📡 Connecting via SSH to Azure VM (20.91.240.54:2222) to deploy latest code...');

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['azureuserSami@11095']);
});

conn.on('ready', () => {
  console.log('✅ SSH Connection established!');

  const commands = [
    'echo azureuserSami@11095 | sudo -S pm2 list',
    'echo azureuserSami@11095 | sudo -S pm2 delete all',
    'cd /home/azureuser/egx-stock-bot',
    'git pull origin main',
    'npx tsc',
    'pm2 start dist/index.js --name "egx-stock-bot"',
    'pm2 save',
    'sleep 3',
    'curl -i http://127.0.0.1:5000/api/fair-value-compare | head -n 25'
  ].join(' && echo "\n---COMMAND-SEPARATOR---\n" && ');

  conn.exec(commands, (err, stream) => {
    if (err) {
      console.error('❌ Execution error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code: number) => {
      console.log(`\n🎉 Deployment finished with exit code ${code}!`);
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
