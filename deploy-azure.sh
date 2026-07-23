#!/bin/bash
# Azure VM Deployment Script for EGX Stock Telegram Bot

echo "🚀 Starting Azure VM Deployment for EGX Stock Telegram Bot..."

# 1. Update packages and install Node.js & PM2
echo "📦 Installing Node.js and PM2 Process Manager..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2

# 2. Clone repository
echo "📂 Cloning repository from GitHub..."
cd ~
rm -rf egx-stock-bot
git clone https://github.com/Mahmoudsami11095/egx-stock-bot.git
cd egx-stock-bot

# 3. Install dependencies & build
echo "🔨 Installing dependencies and building TypeScript project..."
npm install
npm run build

# 4. Create .env configuration
echo "🔑 Writing environment configuration..."
cat <<EOT > .env
TELEGRAM_BOT_TOKEN=8640417766:AAHCYMvRWnhAvioS5GKwGszt9MULys-obZg
TELEGRAM_CHAT_ID=
POLL_INTERVAL_MINUTES=5
MARKET_HOURS_ONLY=false
CRON_SCHEDULE=*/5 * * * *
NODE_ENV=production
EOT

# 5. Start bot with PM2 for 24/7 automatic running
echo "⚡ Starting bot with PM2 background process manager..."
pm2 stop egx-stock-bot || true
pm2 delete egx-stock-bot || true
pm2 start dist/index.js --name "egx-stock-bot"
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER || true

echo "========================================================="
echo "✅ DEPLOYMENT COMPLETE! Your Stock Bot is running 24/7!"
echo "View bot logs anytime on Azure VM with: pm2 logs egx-stock-bot"
echo "========================================================="
