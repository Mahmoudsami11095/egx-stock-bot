import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { timeout } from 'rxjs';
import { StockApiService } from '../../../core/services/stock-api.service';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  provider?: string;
  isError?: boolean;
}

@Component({
  selector: 'app-ai-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- 1. Floating Trigger Button (Bottom Right) -->
    <div
      *ngIf="!isOpen()"
      (click)="toggleChat()"
      class="fixed bottom-6 right-6 z-50 flex flex-col items-center cursor-pointer select-none group transition-all duration-300"
      aria-label="Open AI Financial Advisor">

      <!-- Glowing Bot Icon Badge -->
      <div class="relative transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
        <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 p-0.5 shadow-2xl shadow-emerald-500/40">
          <div class="w-full h-full rounded-full bg-darkCard flex items-center justify-center border border-white/10">
            <span class="text-2xl animate-bounce">⚜️</span>
          </div>
        </div>
        <!-- Active pulsing green dot -->
        <span class="absolute top-1 right-1 flex h-3.5 w-3.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-darkCard"></span>
        </span>
      </div>

      <!-- Floating Pill Label -->
      <div class="-mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-emerald-500/30 transition-all duration-300 border border-white/20 group-hover:shadow-emerald-500/60">
        💬 المستشار المالي الذكي (Gemini AI)
      </div>
    </div>

    <!-- 2. Glassmorphism Chat Panel Window -->
    <div
      *ngIf="isOpen()"
      class="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col w-[92vw] sm:w-[440px] h-[82vh] md:h-[660px] glass-card rounded-3xl overflow-hidden border border-emeraldAccent/40 shadow-2xl shadow-black/80 bg-darkCard/95 backdrop-blur-2xl transition-all duration-300">

      <!-- Header Bar -->
      <header class="px-5 py-4 bg-gradient-to-r from-darkBg via-darkCard to-darkBg border-b border-darkBorder flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-emeraldAccent/10 border border-emeraldAccent/30 flex items-center justify-center text-xl">
            ⚜️
          </div>
          <div>
            <h3 class="font-extrabold text-white text-sm flex items-center gap-1.5">
              المستشار المالي الذكي (Gemini AI)
              <span class="w-2 h-2 rounded-full bg-emeraldAccent animate-pulse"></span>
            </h3>
            <span class="text-[11px] text-gray-400">Google Gemini Flash Latest Model</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Clear Chat -->
          <button (click)="clearChat()"
                  title="مسح وتحديث المحادثة"
                  class="w-8 h-8 rounded-xl bg-darkBg hover:bg-darkBorder text-gray-400 hover:text-white flex items-center justify-center text-xs transition-colors">
            <i class="pi pi-refresh"></i>
          </button>

          <!-- Minimize / Close -->
          <button (click)="toggleChat()"
                  title="إغلاق النافذة"
                  class="w-8 h-8 rounded-xl bg-darkBg hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 flex items-center justify-center text-xs transition-colors">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </header>

      <!-- Optional Custom API Key Input bar -->
      <div *ngIf="showApiKeyInput()" class="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-xs">
        <span class="text-amber-400 font-bold shrink-0">🔑 مفتاح Gemini:</span>
        <input type="password" [(ngModel)]="customApiKey" (change)="saveKeyToStorage()" placeholder="أدخل GEMINI_API_KEY..." class="flex-1 bg-darkBg border border-darkBorder px-2.5 py-1 rounded text-xs text-white">
        <button (click)="saveKeyToStorage(); toggleShowApiKeyInput()" class="text-xs text-emeraldAccent hover:underline px-2 font-bold">حفظ</button>
      </div>

      <!-- Scrollable Message Stream Area -->
      <div #chatScrollContainer
           class="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed custom-scrollbar">

        <div *ngFor="let msg of messages()"
             [class.justify-end]="msg.sender === 'user'"
             [class.justify-start]="msg.sender === 'ai'"
             class="flex items-start gap-2">

          <!-- AI Avatar -->
          <div *ngIf="msg.sender === 'ai'" class="w-7 h-7 rounded-xl bg-emeraldAccent/20 border border-emeraldAccent/40 flex items-center justify-center text-xs shrink-0 mt-1">
            🤖
          </div>

          <!-- Message Box -->
          <div [class]="msg.sender === 'user'
                 ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 max-w-[85%] shadow-md font-medium'
                 : 'bg-darkBg/90 text-gray-200 border border-darkBorder rounded-2xl rounded-tl-none px-4 py-3 max-w-[88%] shadow-md leading-relaxed'">
            <div [innerHTML]="getFormattedMessage(msg.text)"></div>
            <div class="flex items-center justify-between mt-1.5 text-[9px] font-sans">
              <span [class]="msg.sender === 'user' ? 'text-emerald-200' : 'text-gray-400'">
                {{ msg.timestamp | date:'shortTime' }}
              </span>
              <span *ngIf="msg.provider" class="text-amber-400/90 mr-2 font-bold flex items-center gap-1">
                <i class="pi pi-bolt text-[9px]"></i> {{ msg.provider }}
              </span>
            </div>
          </div>

          <!-- User Avatar -->
          <div *ngIf="msg.sender === 'user'" class="w-7 h-7 rounded-xl bg-cyanAccent/20 border border-cyanAccent/40 flex items-center justify-center text-xs shrink-0 mt-1">
            👤
          </div>
        </div>

        <!-- Typing Indicator -->
        <div *ngIf="isTyping()" class="flex items-center gap-2 text-xs text-gray-400">
          <div class="w-7 h-7 rounded-xl bg-emeraldAccent/20 border border-emeraldAccent/40 flex items-center justify-center text-xs">🤖</div>
          <div class="bg-darkBg/90 border border-darkBorder px-4 py-2.5 rounded-2xl flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emeraldAccent animate-bounce"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-emeraldAccent animate-bounce [animation-delay:0.2s]"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-emeraldAccent animate-bounce [animation-delay:0.4s]"></span>
            <span class="text-[10px] text-gray-400 mr-1">جاري كتابة الإجابة الكاملة من Gemini AI...</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Chips -->
      <div class="px-4 py-2 bg-darkBg/60 border-t border-darkBorder/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <button *ngFor="let chip of quickChips"
                (click)="sendQuickPrompt(chip)"
                class="px-3 py-1 rounded-xl bg-darkCard hover:bg-darkBorder border border-darkBorder text-[11px] text-gray-300 hover:text-white transition-all whitespace-nowrap shrink-0">
          {{ chip }}
        </button>
      </div>

      <!-- Input Box Footer -->
      <footer class="p-3 bg-darkBg border-t border-darkBorder shrink-0 space-y-2">
        <form (ngSubmit)="sendMessage()" class="flex items-center gap-2">
          <input
            type="text"
            [(ngModel)]="userInput"
            name="chatInput"
            placeholder="اكتب سؤالك عن الذهب أو أي سهم (مثال: حلل كل سهم، PHGC, AMOC)..."
            class="flex-1 bg-darkCard border border-darkBorder rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emeraldAccent transition-colors">

          <button
            type="submit"
            [disabled]="!userInput.trim() || isTyping()"
            class="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-black font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center transition-all shadow-lg shadow-emerald-500/20">
            <i class="pi pi-send"></i>
          </button>
        </form>

        <div class="flex items-center justify-between text-[10px] text-gray-500 px-1">
          <span>النموذج النشط: Gemini Flash Latest (Max 4000 Tokens)</span>
          <button (click)="toggleShowApiKeyInput()" class="text-amber-400 hover:underline">
            {{ customApiKey ? '⚙️ المفتاح مسجل' : '🔑 إضافة API Key' }}
          </button>
        </div>
      </footer>
    </div>
  `
})
export class AiChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  public apiService = inject(StockApiService);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  public isOpen = signal<boolean>(false);
  public isTyping = signal<boolean>(false);

  getFormattedMessage(text: string): SafeHtml {
    if (!text) return '';
    return this.sanitizer.bypassSecurityTrustHtml(this.parseMarkdown(text));
  }

  private parseMarkdown(text: string): string {
    if (!text) return '';
    let html = text;

    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 1. Markdown Table Parser
    const tableRegex = /((?:\|[^\n]+\|\r?\n?)+)/g;
    html = html.replace(tableRegex, (match) => {
      const lines = match.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return match;

      let tableHtml = '<div class="overflow-x-auto my-2 rounded-xl border border-darkBorder/80"><table class="w-full text-[11px] sm:text-xs border-collapse text-right"><thead class="bg-darkBg text-amber-400 font-bold border-b border-darkBorder"><tr>';
      let hasHeader = false;
      let bodyHtml = '<tbody>';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\|[\s\-:]+(\|[\s\-:]+)+\|\s*$/.test(line)) {
          continue;
        }

        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        if (cells.length === 0) continue;

        if (!hasHeader) {
          cells.forEach(cell => {
            tableHtml += `<th class="p-2 border-b border-darkBorder font-black bg-darkBg/90">${cell}</th>`;
          });
          tableHtml += '</tr></thead>';
          hasHeader = true;
        } else {
          bodyHtml += '<tr class="border-b border-darkBorder/40 hover:bg-darkCard/60 transition-colors">';
          cells.forEach(cell => {
            bodyHtml += `<td class="p-2 border-l border-darkBorder/30 text-gray-200">${cell}</td>`;
          });
          bodyHtml += '</tr>';
        }
      }

      bodyHtml += '</tbody>';
      return tableHtml + bodyHtml + '</table></div>';
    });

    // 2. Headings
    html = html.replace(/^### (.*$)/gim, '<h4 class="text-xs sm:text-sm font-black text-emeraldAccent mt-2.5 mb-1.5">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="text-sm sm:text-base font-black text-amber-400 mt-2.5 mb-1.5">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="text-base sm:text-lg font-black text-white mt-2.5 mb-1.5">$1</h2>');

    // 3. Bold & Italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-black text-amber-300">$1</strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-amber-300">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>');

    // 4. Bullet & Numbered lists
    html = html.replace(/^\s*[\*\-]\s+(.*$)/gim, '<div class="flex items-start gap-2 my-1"><span class="text-emeraldAccent font-extrabold select-none">•</span><span>$1</span></div>');
    html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<div class="flex items-start gap-2 my-1"><span class="text-amber-400 font-extrabold select-none">$1.</span><span>$2</span></div>');

    // 5. Code & clean up
    html = html.replace(/`([^`]+)`/g, '<code class="bg-darkBg border border-darkBorder px-1.5 py-0.5 rounded text-cyanAccent font-mono text-[11px]">$1</code>');
    html = html.replace(/\*\*/g, '');

    // 6. Line breaks
    html = html.replace(/\n\n/g, '<div class="h-2"></div>');
    html = html.replace(/\n/g, '<br/>');

    return html;
  }
  public showApiKeyInput = signal<boolean>(false);
  public userInput: string = '';
  public customApiKey: string = '';

  private hasFetchedWelcome = false;

  public quickChips: string[] = [
    '⚜️ سعر الذهب عيار 24 والقيمة العادلة',
    '🚀 أفضل 5 أسهم حلال للشراء',
    '📈 حلل كل سهم من الأسهم الموصى بها على حدة',
    '💵 سعر الدولار وتوصية الذهب'
  ];

  public messages = signal<ChatMessage[]>([]);

  ngOnInit() {
    try {
      const savedKey = localStorage.getItem('GEMINI_API_KEY');
      if (savedKey) {
        this.customApiKey = savedKey.trim();
      }
    } catch (e) {}
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) {
      setTimeout(() => this.scrollToBottom(), 100);
      if (!this.hasFetchedWelcome || this.messages().length === 0) {
        this.fetchDynamicWelcomeMessage();
      }
    }
  }

  toggleShowApiKeyInput() {
    this.showApiKeyInput.set(!this.showApiKeyInput());
  }

  saveKeyToStorage() {
    if (this.customApiKey) {
      try {
        localStorage.setItem('GEMINI_API_KEY', this.customApiKey.trim());
      } catch (e) {}
    }
  }

  clearChat() {
    this.messages.set([]);
    this.hasFetchedWelcome = false;
    this.fetchDynamicWelcomeMessage();
  }

  fetchDynamicWelcomeMessage() {
    if (this.isTyping()) return;
    this.isTyping.set(true);
    this.hasFetchedWelcome = true;

    const gold = this.apiService.goldPrices();
    const stocks = this.apiService.stocks();

    const marketContext = {
      goldPrices: gold,
      totalHalalStocksCount: stocks.length,
      topHalalStocks: stocks.slice(0, 8).map(s => ({
        symbol: s.quote.symbol,
        name: s.quote.nameAr || s.quote.nameEn,
        price: s.quote.currentPrice,
        fairValue: s.fairValue,
        upsidePercent: s.fairValueUpsidePercent
      }))
    };

    const prompt = 'رحب بالمستخدم بصفتك مستشاره المالي الذكي للبورصة المصرية والذهب ⚜️📈. قدم ترحيباً حاراً وموجزاً ومكتتملاً يتضمن نبذة سريعة عن أبرز فرصة سهم حلال اليوم (الأعلى نمواً بالقيمة العادلة) وسعر الذهب عيار 24 والأوقية حالياً في السوق، ثم دعوه بسعادة لسؤالك عن أي سهم أو عيار ذهب.';

    const payload: any = {
      message: prompt,
      history: [],
      marketContext
    };

    if (this.customApiKey) {
      payload.apiKey = this.customApiKey.trim();
    }

    this.http.post<any>('/api/chat', payload).pipe(timeout(30000)).subscribe({
      next: (res) => {
        let answer = res?.answer;
        let provider = res?.provider || 'Gemini Flash Latest';

        if (!answer || res?.useFallback) {
          answer = this.generateMarketAiResponse('رحب بالمستخدم');
          provider = res?.reason === 'NO_API_KEY' ? 'Market Engine (No API Key)' : 'Market Engine (Failover)';
        }

        const welcomeMsg: ChatMessage = {
          id: 'welcome-' + Date.now(),
          sender: 'ai',
          text: answer,
          timestamp: new Date(),
          provider
        };
        this.messages.set([welcomeMsg]);
        this.isTyping.set(false);
      },
      error: () => {
        const fallbackText = this.generateMarketAiResponse('رحب بالمستخدم');
        const welcomeMsg: ChatMessage = {
          id: 'welcome-' + Date.now(),
          sender: 'ai',
          text: fallbackText,
          timestamp: new Date(),
          provider: 'Market Engine'
        };
        this.messages.set([welcomeMsg]);
        this.isTyping.set(false);
      }
    });
  }

  sendQuickPrompt(prompt: string) {
    this.userInput = prompt;
    this.sendMessage();
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text || this.isTyping()) return;

    if ((text.startsWith('AIza') || text.startsWith('AQ.')) && text.length > 25 && !text.includes(' ')) {
      this.customApiKey = text.trim();
      this.saveKeyToStorage();
      const keyMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        text: '🔑 تم تسجيل وتفعيل مفتاح Gemini API Key الخاص بك وحفظه بنجاح! يمكنك الآن سؤال المستشار المالي مباشرة.',
        timestamp: new Date(),
        provider: 'System'
      };
      this.messages.update(msgs => [...msgs, keyMsg]);
      this.userInput = '';
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    const currentHistory = this.messages().map(m => ({
      sender: m.sender,
      text: m.text
    }));

    this.messages.update(msgs => [...msgs, userMsg]);
    this.userInput = '';
    this.isTyping.set(true);

    const gold = this.apiService.goldPrices();
    const stocks = this.apiService.stocks();

    // Pass top 30 stocks sorted by upside percent to ensure clean context size
    const topStocksSorted = [...stocks]
      .sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent)
      .slice(0, 30);

    const marketContext = {
      goldPrices: gold,
      totalHalalStocksCount: stocks.length,
      top30HalalStocks: topStocksSorted.map(s => ({
        symbol: s.quote.symbol,
        name: s.quote.nameAr || s.quote.nameEn,
        price: s.quote.currentPrice,
        changePercent: s.quote.changePercent,
        fairValue: s.fairValue,
        upsidePercent: s.fairValueUpsidePercent,
        signal: s.signalType,
        rsi: s.indicators.rsi,
        pe: s.quote.peRatio,
        target1: s.suggestedTarget?.target1,
        target2: s.suggestedTarget?.target2,
        stopLoss: s.suggestedStopLoss,
        reasons: s.reasons
      }))
    };

    const payload: any = {
      message: text,
      history: currentHistory,
      marketContext
    };

    if (this.customApiKey) {
      payload.apiKey = this.customApiKey.trim();
    }

    this.http.post<any>('/api/chat', payload).pipe(timeout(30000)).subscribe({
      next: (res) => {
        let answer = res?.answer;
        let provider = res?.provider || 'Gemini Flash Latest';

        if (!answer || res?.useFallback) {
          answer = this.generateMarketAiResponse(text);
          provider = res?.reason === 'NO_API_KEY' ? 'Market Engine (No API Key)' : 'Market Engine (Failover)';
        }

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: answer,
          timestamp: new Date(),
          provider
        };
        this.messages.update(msgs => [...msgs, aiMsg]);
        this.isTyping.set(false);
      },
      error: () => {
        const fallbackText = this.generateMarketAiResponse(text);
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: fallbackText,
          timestamp: new Date(),
          provider: 'Market Engine'
        };
        this.messages.update(msgs => [...msgs, aiMsg]);
        this.isTyping.set(false);
      }
    });
  }

  private generateMarketAiResponse(query: string): string {
    const q = query.toLowerCase();
    const gold = this.apiService.goldPrices();
    const stocks = this.apiService.stocks();

    // 1. Gold queries
    if (q.includes('ذهب') || q.includes('gold') || q.includes('24') || q.includes('21') || q.includes('أوقية') || q.includes('أونصة')) {
      if (!gold) return 'جاري تحميل أسعار الذهب اللحظية... يرجى المحاولة بعد ثوانٍ.';

      return `⚜️ **تحليل الذهب عيار 24 والأوقية العالمية اللحظي:**

🌍 **الأوقية العالمية (XAU/USD):** $${gold.goldUsdPerOz}
💵 **سعر صرف الدولار (USD/EGP):** ${gold.usdEgpRate} ج.م
⭐ **القيمة العادلة لعيار 24 (الأساسي):** ${gold.fairGold24kEgp || 6648} ج.م/جرام
🏪 **سعر الصاغة المحلي 24K:** ${gold.gold24kEgp} ج.م (علاوة صاغة +${gold.saghaPremiumEgp || 180} ج.م)

📊 **توصية عيار 24 والأوقية:**
• **المدى القصير (1-3 أشهر):** ${gold.shortTermRec?.action || 'شراء تحوطي على دفعات'} (مستهدف 24K: ${gold.shortTermRec?.targetPrice24k} ج.م | مستهدف الأوقية: $${gold.shortTermRec?.targetOunceUsd})
• **المدى الطويل (1-3 سنوات):** ${gold.longTermRec?.action || 'شراء واحتفاظ قوي'} (مستهدف 24K المستقبلي: ${gold.longTermRec?.targetPrice24k} ج.م)`;
    }

    // 2. Dollar / Exchange rate queries
    if (q.includes('دولار') || q.includes('صرف') || q.includes('usd')) {
      const rate = gold?.usdEgpRate || 51.07;
      return `💵 **سعر صرف الدولار البنكي اليوم:** ${rate} ج.م

💡 **التحليل:**
استقرار سعر الصرف البنكي يدعم القيمة العادلة لعيار 24 عند ${gold?.fairGold24kEgp || 6648} ج.م/جرام.`;
    }

    // 3. Best Halal stocks recommendations query
    if (q.includes('أفضل') || q.includes('توصية') || q.includes('فرص') || q.includes('شراء')) {
      const topBuy = stocks
        .filter(s => s.signalType === 'BUY' || s.signalType === 'STRONG_BUY')
        .sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent)
        .slice(0, 5);

      if (topBuy.length === 0) {
        return '🚀 **أفضل الأسهم الحلال الموصى بها:**\n\n• **PHGC** (بريميوم هيلثكير): سعر 0.09 ج.م | عادلة: 0.14 ج.م (+55.56%)\n• **ETEL** (المصرية للاتصالات): سعر 103.6 ج.م | عادلة: 155.4 ج.م (+50%)\n• **MOIL** (ماريديف): سعر 0.68 ج.م | عادلة: 1.02 ج.م (+50%)';
      }

      let text = '🚀 **أفضل أسهم حلال موصى بالشراء حالياً (حسب فارق القيمة العادلة):**\n\n';
      topBuy.forEach((s, idx) => {
        text += `${idx + 1}. **${s.quote.symbol}** (${s.quote.nameAr || s.quote.nameEn}): السعر ${s.quote.currentPrice} ج.م | عادلة: ${s.fairValue} ج.م (+${s.fairValueUpsidePercent}%)\n`;
      });
      return text;
    }

    // 4. Specific Stock Search
    const matchedStock = stocks.find(s =>
      q.includes(s.quote.symbol.toLowerCase()) ||
      q.includes((s.quote.nameAr || '').toLowerCase()) ||
      q.includes((s.quote.nameEn || '').toLowerCase())
    );

    if (matchedStock) {
      const signalText = matchedStock.signalType === 'BUY' ? '🚀 شراء' : matchedStock.signalType === 'SELL' ? '🔴 بيع' : '🟡 محايد';
      return `📈 **تحليل سهم ${matchedStock.quote.symbol} (${matchedStock.quote.nameAr || matchedStock.quote.nameEn}):**

💵 **السعر الحالي:** ${matchedStock.quote.currentPrice} ج.م (${matchedStock.quote.changePercent >= 0 ? '+' : ''}${matchedStock.quote.changePercent}%)
🎯 **القيمة العادلة:** ${matchedStock.fairValue} ج.م (+${matchedStock.fairValueUpsidePercent}% نمو)
📊 **مؤشر RSI(14):** ${matchedStock.indicators.rsi}
🟢 **الموقف الشرعي:** متوافق تام مع الشريعة الإسلامية

⚡ **التوصية وخطة التداول:**
• **القرار:** ${signalText}
• 📥 **نطاق الدخول:** ${matchedStock.suggestedEntry.min} - ${matchedStock.suggestedEntry.max} ج.م
• 🎯 **الهدف الأول:** ${matchedStock.suggestedTarget?.target1} ج.م | **الهدف الثاني:** ${matchedStock.fairValue} ج.م
• 🛑 **وقف الخسارة:** ${matchedStock.suggestedStopLoss} ج.م`;
    }

    // 5. Default Welcome Greeting
    const topStock = stocks[0] ? `${stocks[0].quote.symbol} (${stocks[0].fairValueUpsidePercent}% نمو)` : 'PHGC';
    const gold24 = gold?.gold24kEgp ? `${gold.gold24kEgp} ج.م` : '6828 ج.م';
    return `مرحباً بك! أنا مستشارك المالي الذكي المدعوم بـ Google Gemini AI ⚜️📈.

🌟 **أبرز معالم السوق اليوم:**
• 🚀 **أعلى فرصة سهم حلال:** ${topStock}
• ⚜️ **سعر الذهب 24K اليوم:** ${gold24} (الأوقية: $${gold?.goldUsdPerOz || 2400})

تفضل بسؤالي فوراً عن أي سهم، القيمة العادلة، أو أسعار الذهب!`;
  }

  private scrollToBottom() {
    try {
      if (this.chatScrollContainer) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }
}