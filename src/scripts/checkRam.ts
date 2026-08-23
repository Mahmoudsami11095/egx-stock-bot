import { Client } from 'ssh2';

const conn = new Client();

conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  finish(['azureuserSami@11095']);
});

conn.on('ready', () => {
  conn.exec('free -h && echo "--- PM2 STATUS ---" && pm2 list', (err, stream) => {
    if (err) {
      console.error('Execution error:', err);
      conn.end();
      return;
    }

    stream.on('close', () => {
      conn.end();
    }).on('data', (data: Buffer) => {
      process.stdout.write(data.toString());
    });
  });
}).connect({
  host: '20.91.240.54',
  port: 2222,
  username: 'azureuser',
  password: 'azureuserSami@11095',
  tryKeyboard: true,
  readyTimeout: 30000
});
