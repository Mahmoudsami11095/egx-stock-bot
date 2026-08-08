const https = require('https');
const stocksApi = require('./stocks.js');
const goldApi = require('./gold.js');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8640417766:AAHCYMvRWnhAvioS5GKwGszt9MULys-obZg';

function sendTelegramMessage(chatId, text, replyMarkup = null) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 8000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(body));
    });

    req.on('error', (e) => resolve(null));
    req.write(payload);
    req.end();
  });
}

function getMockRes() {
  let resData = null;
  let resCode = 200;
  return {
    setHeader: () => {},
    status: (code) => {
      resCode = code;
      return {
        json: (data) => { resData = data; }
      };
    },
    json: (data) => { resData = data; },
    _getResult: () => resData
  };
}

async function fetchStocksData() {
  const mockReq = { query: {} };
  const mockRes = getMockRes();
  await stocksApi(mockReq, mockRes);
  return mockRes._getResult() || [];
}

async function fetchGoldData() {
  const mockReq = { query: {} };
  const mockRes = getMockRes();
  await goldApi(mockReq, mockRes);
  return mockRes._getResult() || {};
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET setup route
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      bot: 'SamiStocksBot Telegram Serverless Webhook (Vercel)',
      webhookUrl: 'https://stocks.templatesnippet.com/api/telegram-webhook'
    });
  }

  try {
    const update = req.body || {};
    const message = update.message || update.edited_message;

    if (!message || !message.chat || !message.chat.id) {
      return res.status(200).send('OK');
    }

    const chatId = message.chat.id;
    const text = (message.text || '').trim();

    if (!text) {
      return res.status(200).send('OK');
    }

    console.log(`🤖 Received Telegram Webhook Command: "${text}" from Chat ID: ${chatId}`);

    // Command: /start or /help
    if (text.startsWith('/start') || text.startsWith('/help')) {
      const welcomeMsg = `<b>📊 مرحباً بك في بوت فحص البورصة المصرية وأسعار الذهب (EGX Stock Bot)</b>\n\n` +
        `اختر من القائمة أدناه أو اكتب اسم/رمز أي سهم لبدء الفحص الفوري:\n\n` +
        `🔹 <b>/stocks</b> - أهم الفرص والقيم العادلة للأسهم\n` +
        `🌙 <b>/halal</b> - الأسهم المتوافقة مع الشريعة\n` +
        `🥇 <b>/gold</b> - أسعار الذهب الفورية والتوصية\n` +
        `🔍 اكتب اسم أو كود أي سهم (مثال: <code>COMI</code> أو <code>السويدي</code>)`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📊 فحص الأسهم (/stocks)', callback_data: '/stocks' },
            { text: '🌙 الأسهم الحلال (/halal)', callback_data: '/halal' }
          ],
          [
            { text: '🥇 أسعار الذهب (/gold)', callback_data: '/gold' },
            { text: '🌐 فتح شاشة الفحص أونلاين', url: 'https://stocks.templatesnippet.com' }
          ]
        ]
      };

      await sendTelegramMessage(chatId, welcomeMsg, keyboard);
      return res.status(200).send('OK');
    }

    // Command: /gold
    if (text.startsWith('/gold') || text.includes('ذهب')) {
      const gold = await fetchGoldData();
      const goldMsg = `<b>🥇 أسعار وتوصية الذهب الفورية (مصر)</b>\n\n` +
        `🔹 <b>عيار 24:</b> ${gold.gold24kEgp || '6,658'} ج.م / جرام\n` +
        `🔹 <b>عيار 21:</b> ${gold.gold21kEgp || '5,826'} ج.م / جرام\n` +
        `🔹 <b>عيار 18:</b> ${gold.gold18kEgp || '4,993'} ج.م / جرام\n` +
        `👑 <b>الجنيه الذهب:</b> ${gold.goldCoinEgp || '46,608'} ج.م\n` +
        `🌍 <b>الأونصة عالمياً:</b> $${gold.goldUsdPerOz || '4,048.58'}\n` +
        `💵 <b>سعر صرف الدولار:</b> ${gold.usdEgpRate || '49.80'} ج.م\n\n` +
        `💡 <b>التوصية:</b> ${gold.shortTermRec?.action || 'شراء تحوطي على دفعات'}\n` +
        `📌 <b>السبب:</b> ${gold.shortTermRec?.reason || 'منطقة تجميع إيجابية للذهب مع علاوة صاغة معتدلة'}`;

      await sendTelegramMessage(chatId, goldMsg);
      return res.status(200).send('OK');
    }

    // Command: /stocks or /halal
    if (text.startsWith('/stocks') || text.startsWith('/halal') || text.includes('أسهم')) {
      const isHalalOnly = text.startsWith('/halal');
      const stocks = await fetchStocksData();
      let filtered = isHalalOnly ? stocks.filter(s => s.isHalal) : stocks;

      // Sort by highest fair value upside
      filtered.sort((a, b) => (b.fairValueUpsidePercent || 0) - (a.fairValueUpsidePercent || 0));
      const topPicks = filtered.slice(0, 7);

      let msg = isHalalOnly
        ? `<b>🌙 أفضل الأسهم الحلال المتوافقة مع الشريعة في البورصة المصرية:</b>\n\n`
        : `<b>📊 أعلى الفرص والقيم العادلة لأسهم البورصة المصرية (EGX):</b>\n\n`;

      topPicks.forEach(s => {
        const halalBadge = s.isHalal ? '🌙' : '🔴';
        const upside = s.fairValueUpsidePercent > 0 ? `+${s.fairValueUpsidePercent}%` : `${s.fairValueUpsidePercent}%`;
        msg += `${halalBadge} <b>${s.symbol}</b> - ${s.name}\n` +
          `💰 السعر: ${s.currentPrice} ج.م | 🎯 العادلة: ${s.fairValue} ج.م (${upside})\n\n`;
      });

      msg += `🌐 <i>عرض باقي الأسهم على المنصة: https://stocks.templatesnippet.com</i>`;
      await sendTelegramMessage(chatId, msg);
      return res.status(200).send('OK');
    }

    // Stock Search (by symbol or Arabic name query e.g. "COMI" or "أبو قير")
    const query = text.replace('/', '').toUpperCase().trim();
    const stocks = await fetchStocksData();
    const found = stocks.find(s =>
      s.symbol.toUpperCase() === query ||
      (s.name && s.name.toUpperCase().includes(query)) ||
      (s.symbol && query.includes(s.symbol.toUpperCase()))
    );

    if (found) {
      const upside = found.fairValueUpsidePercent > 0 ? `+${found.fairValueUpsidePercent}%` : `${found.fairValueUpsidePercent}%`;
      const halalBadge = found.isHalal ? '🌙 متوافق مع الشريعة' : '🔴 غير متوافق (أسهم تقليدية/بنوك)';
      const signalEmoji = (found.signalType === 'BUY' || found.signalType === 'STRONG_BUY') ? '🟢 شراء' : '🟡 محايد/مراقبة';

      const detailMsg = `<b>📊 نتيجة فحص سهم: ${found.symbol}</b>\n` +
        `🏢 ${found.name}\n\n` +
        `💰 <b>السعر الحالي:</b> ${found.currentPrice} ج.م\n` +
        `🎯 <b>القيمة العادلة المحسوبة:</b> ${found.fairValue} ج.م (${upside})\n` +
        `📈 <b>مؤشر RSI:</b> ${found.rsi} | 📊 <b>P/E Ratio:</b> ${found.peRatio || 'N/A'}\n` +
        `💡 <b>إشارة التحليل الفني:</b> ${signalEmoji}\n` +
        `⚖️ <b>الشرعية:</b> ${halalBadge}\n\n` +
        `📌 <b>توصية طويلة الأجل:</b> ${found.longTermRec?.action || 'تجميع استثماري'}\n` +
        `<i>${found.longTermRec?.reason || ''}</i>`;

      await sendTelegramMessage(chatId, detailMsg);
      return res.status(200).send('OK');
    }

    // Default unknown command
    const defaultMsg = `⚠️ لم نتمكن من العثور على سهم باسم <b>${text}</b>.\n\n` +
      `جرب استخدام الكود الرسمي للسهم مثل <code>COMI</code>, <code>ABUK</code>, <code>SWDY</code>, <code>EGAL</code> أو اختر من القائمة:\n/stocks | /halal | /gold`;

    await sendTelegramMessage(chatId, defaultMsg);
    return res.status(200).send('OK');

  } catch (err) {
    console.error('Error handling Telegram Webhook:', err);
    return res.status(200).send('OK');
  }
};
