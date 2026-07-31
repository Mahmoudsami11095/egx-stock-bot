import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockApiService } from '../../core/services/stock-api.service';

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '9M' | '1Y';

@Component({
  selector: 'app-gold-tracker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 pb-12">
      <!-- Page Header -->
      <div class="space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              ⚜️ أسعار وتحليل الذهب عيار 24 والأوقية العالمية (Live Gold Tracker)
            </h2>
            <p class="text-xs sm:text-sm text-gray-400 mt-1">
              حساب القيمة العادلة لجرام الذهب عيار 24 والأوقية العالمية بالدولار مع مقارنة سعر الصاغة المحلي والتوصيات
            </p>
          </div>
          <div class="flex items-center gap-2 bg-emeraldAccent/10 border border-emeraldAccent/30 text-emeraldAccent px-3 py-1.5 rounded-xl text-xs font-bold">
            <span class="w-2 h-2 rounded-full bg-emeraldAccent animate-pulse"></span>
            تحديث لحظي ({{ apiService.goldPrices()?.provider || 'Live Market' }})
          </div>
        </div>
      </div>

      <!-- Fair Price Highlight Banner -->
      <div class="glass-card p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-darkCard to-cyanAccent/10 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-darkBorder/60 pb-4">
          <div>
            <span class="text-xs text-amber-400 font-extrabold tracking-wider uppercase bg-amber-400/10 px-2.5 py-1 rounded-lg">
              ⭐ القيمة العادلة الأساسية للذهب عيار 24 والأوقية العالمية
            </span>
            <h3 class="text-3xl sm:text-4xl font-black text-white mt-2">
              {{ apiService.goldPrices()?.fairGold24kEgp || 6648 }} <span class="text-base font-normal text-gray-400">ج.م / جرام 24K</span>
            </h3>
          </div>

          <div class="text-left space-y-1">
            <span class="text-xs text-gray-400">الأوقية العالمية مباشر (XAU/USD):</span>
            <div class="text-2xl font-black text-cyanAccent">
              &#36;{{ apiService.goldPrices()?.goldUsdPerOz }} <span class="text-xs font-normal text-gray-400">/ أونصة</span>
            </div>
            <div class="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full">
              الصاغة: {{ apiService.goldPrices()?.gold24kEgp || 6828 }} ج.م (+{{ apiService.goldPrices()?.saghaPremiumPercent || 2.7 }}%)
            </div>
          </div>
        </div>

        <!-- Formula Explanation -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-300 pt-1">
          <div class="bg-darkBg/60 p-3.5 rounded-xl border border-darkBorder flex items-center justify-between">
            <span>الأوقية العالمية بالدولار:</span>
            <strong class="text-cyanAccent font-extrabold">&#36;{{ apiService.goldPrices()?.goldUsdPerOz }}</strong>
          </div>
          <div class="bg-darkBg/60 p-3.5 rounded-xl border border-darkBorder flex items-center justify-between">
            <span>سعر صرف الدولار (USD/EGP):</span>
            <strong class="text-white font-extrabold">{{ apiService.goldPrices()?.usdEgpRate }} ج.م</strong>
          </div>
          <div class="bg-darkBg/60 p-3.5 rounded-xl border border-darkBorder flex items-center justify-between">
            <span>وزن الأوقية بالجرام:</span>
            <strong class="text-gray-300 font-extrabold">31.1035 جرام 24K</strong>
          </div>
        </div>
      </div>

      <!-- Live Gold Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 24K Gold -->
        <div class="glass-card p-6 rounded-2xl border-l-4 border-l-amber-400 space-y-3 relative overflow-hidden">
          <div class="absolute -right-8 -bottom-8 w-24 h-24 bg-amber-400/10 rounded-full blur-xl"></div>
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold">
            <span>الذهب عيار 24 (القياسي)</span>
            <span class="text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-full font-extrabold">⭐ الأساسي والسبائك</span>
          </div>
          <div class="text-3xl font-black text-amber-400">
            {{ apiService.goldPrices()?.gold24kEgp }} <small class="text-sm font-normal text-gray-400">ج.م/جرام</small>
          </div>
          <div class="text-xs text-emeraldAccent bg-emeraldAccent/10 p-2 rounded-lg flex items-center justify-between">
            <span>القيمة العادلة:</span>
            <strong class="font-bold">{{ apiService.goldPrices()?.fairGold24kEgp || 6648 }} ج.م</strong>
          </div>
        </div>

        <!-- Global Gold Ounce (USD) -->
        <div class="glass-card p-6 rounded-2xl border-l-4 border-l-cyanAccent space-y-3">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold">
            <span>الأوقية العالمية (XAU/USD)</span>
            <span class="text-cyanAccent bg-cyanAccent/10 px-2 py-0.5 rounded-full font-bold">البورصة العالمية</span>
          </div>
          <div class="text-3xl font-black text-cyanAccent">
            &#36;{{ apiService.goldPrices()?.goldUsdPerOz }} <small class="text-xs font-normal text-gray-400">دولار</small>
          </div>
          <div class="text-xs text-gray-300 bg-darkBg/60 p-2 rounded-lg flex items-center justify-between">
            <span>سعر الدولار البنكي:</span>
            <strong class="font-bold text-white">{{ apiService.goldPrices()?.usdEgpRate }} ج.م</strong>
          </div>
        </div>

        <!-- 21K Gold -->
        <div class="glass-card p-6 rounded-2xl border-l-4 border-l-amber-500 space-y-3">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold">
            <span>الذهب عيار 21</span>
            <span class="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">متداول</span>
          </div>
          <div class="text-3xl font-black text-white">
            {{ apiService.goldPrices()?.gold21kEgp }} <small class="text-sm font-normal text-gray-400">ج.م/جرام</small>
          </div>
          <div class="text-xs text-emeraldAccent bg-emeraldAccent/10 p-2 rounded-lg flex items-center justify-between">
            <span>القيمة العادلة:</span>
            <strong class="font-bold">{{ apiService.goldPrices()?.fairGold21kEgp || 5817 }} ج.م</strong>
          </div>
        </div>

        <!-- Sovereign Gold Coin (8g 21K) -->
        <div class="glass-card p-6 rounded-2xl border-l-4 border-l-emeraldAccent space-y-3">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold">
            <span>الجنيه الذهب (8 جرام 21K)</span>
            <span class="text-emeraldAccent bg-emeraldAccent/10 px-2 py-0.5 rounded-full">ادخار</span>
          </div>
          <div class="text-3xl font-black text-emeraldAccent">
            {{ apiService.goldPrices()?.goldCoinEgp }} <small class="text-sm font-normal text-gray-400">ج.م</small>
          </div>
          <div class="text-xs text-emeraldAccent bg-emeraldAccent/10 p-2 rounded-lg flex items-center justify-between">
            <span>القيمة العادلة:</span>
            <strong class="font-bold">{{ apiService.goldPrices()?.fairGoldCoinEgp || 46533 }} ج.م</strong>
          </div>
        </div>
      </div>

      <!-- Short-Term & Long-Term Recommendations -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Short Term Recommendation -->
        <div class="glass-card p-6 rounded-3xl border-l-4 border-l-cyanAccent space-y-4">
          <div class="flex items-center justify-between border-b border-darkBorder pb-3">
            <div class="flex items-center gap-2">
              <i class="pi pi-clock text-cyanAccent text-lg"></i>
              <h3 class="text-base font-bold text-white">توصية المدى القصير (1 - 3 أشهر)</h3>
            </div>
            <span class="bg-cyanAccent/20 text-cyanAccent text-xs font-extrabold px-3 py-1 rounded-full">
              {{ apiService.goldPrices()?.shortTermRec?.badge || 'فرصة تجميع' }}
            </span>
          </div>

          <div class="space-y-3 text-sm">
            <div class="text-lg font-black text-cyanAccent">
              {{ apiService.goldPrices()?.shortTermRec?.action || 'شراء تحوطي على دفعات' }}
            </div>
            <p class="text-xs text-gray-300 leading-relaxed">
              {{ apiService.goldPrices()?.shortTermRec?.reason || 'مؤشر RSI في منطقة تجميع إيجابية لعيار 24 والأوقية العالمية مع علاوة صاغة معتدلة.' }}
            </p>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <div class="bg-darkBg/60 p-3 rounded-xl border border-darkBorder space-y-1">
                <span class="text-xs text-amber-400 font-bold block">مستهدف عيار 24 (ج.م):</span>
                <strong class="text-emeraldAccent text-base font-bold">{{ apiService.goldPrices()?.shortTermRec?.targetPrice24k || 7305 }} ج.م</strong>
                <span class="text-[11px] text-rose-400 block">وقف الأمان: {{ apiService.goldPrices()?.shortTermRec?.stopLoss24k || 6555 }} ج.م</span>
              </div>

              <div class="bg-darkBg/60 p-3 rounded-xl border border-darkBorder space-y-1">
                <span class="text-xs text-cyanAccent font-bold block">مستهدف الأوقية عالمياً ($):</span>
                <strong class="text-cyanAccent text-base font-bold">&#36;{{ apiService.goldPrices()?.shortTermRec?.targetOunceUsd || 4330 }} / أونصة</strong>
                <span class="text-[11px] text-rose-400 block">وقف الأمان: &#36;{{ apiService.goldPrices()?.shortTermRec?.stopLossOunceUsd || 3885 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Long Term Recommendation -->
        <div class="glass-card p-6 rounded-3xl border-l-4 border-l-emeraldAccent space-y-4">
          <div class="flex items-center justify-between border-b border-darkBorder pb-3">
            <div class="flex items-center gap-2">
              <i class="pi pi-shield text-emeraldAccent text-lg"></i>
              <h3 class="text-base font-bold text-white">توصية المدى الطويل (1 - 3 سنوات)</h3>
            </div>
            <span class="bg-emeraldAccent/20 text-emeraldAccent text-xs font-extrabold px-3 py-1 rounded-full">
              {{ apiService.goldPrices()?.longTermRec?.badge || 'استثمار آمن' }}
            </span>
          </div>

          <div class="space-y-3 text-sm">
            <div class="text-lg font-black text-emeraldAccent">
              {{ apiService.goldPrices()?.longTermRec?.action || 'شراء واحتفاظ قوي (ملاذ آمن ممتاز)' }}
            </div>
            <p class="text-xs text-gray-300 leading-relaxed">
              {{ apiService.goldPrices()?.longTermRec?.reason || 'الذهب عيار 24 والأوقية العالمية يُعتبران ملاذاً آمناً رئيسياً لحفظ رأس المال والسبائك من التضخم.' }}
            </p>

            <div class="grid grid-cols-2 gap-3 pt-2">
              <div class="bg-darkBg/60 p-3 rounded-xl border border-darkBorder">
                <span class="text-xs text-amber-400 font-bold block">المستهدف المستقبلي (24K):</span>
                <strong class="text-emeraldAccent text-base font-bold">{{ apiService.goldPrices()?.longTermRec?.targetPrice24k || 8535 }} ج.م</strong>
              </div>

              <div class="bg-darkBg/60 p-3 rounded-xl border border-darkBorder">
                <span class="text-xs text-cyanAccent font-bold block">مستهدف الأوقية عالمياً ($):</span>
                <strong class="text-cyanAccent text-base font-bold">&#36;{{ apiService.goldPrices()?.longTermRec?.targetOunceUsd || 5060 }} / أونصة</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 📈 3 Interactive Market Trend Graphs with 7 Timeframe Buttons -->
      <div class="space-y-6">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-darkBorder pb-3">
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <i class="pi pi-chart-line text-cyanAccent"></i> الرسوم البيانية التفاعلية لحركة أسعار الذهب والدولار
          </h3>

          <!-- Interactive 7-Timeframe Selector Buttons -->
          <div class="flex items-center gap-1 bg-darkBg/80 p-1.5 rounded-2xl border border-darkBorder overflow-x-auto max-w-full">
            <button 
              *ngFor="let tf of timeframes"
              (click)="setTimeframe(tf.id)"
              [class.bg-gradient-to-r]="selectedTimeframe() === tf.id"
              [class.from-cyanAccent]="selectedTimeframe() === tf.id"
              [class.to-teal-500]="selectedTimeframe() === tf.id"
              [class.text-black]="selectedTimeframe() === tf.id"
              [class.font-extrabold]="selectedTimeframe() === tf.id"
              [class.text-gray-400]="selectedTimeframe() !== tf.id"
              [class.hover:text-white]="selectedTimeframe() !== tf.id"
              class="px-3 py-1.5 rounded-xl text-xs transition-all whitespace-nowrap">
              {{ tf.label }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Graph 1: Global Ounce ($XAU/USD) -->
          <div class="glass-card p-5 rounded-3xl border border-cyanAccent/30 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs text-cyanAccent font-bold block">1. الأوقية العالمية (XAU/USD)</span>
                <h4 class="text-xl font-black text-white">&#36;{{ apiService.goldPrices()?.goldUsdPerOz }}</h4>
              </div>
              <span class="bg-cyanAccent/10 text-cyanAccent text-xs font-bold px-2.5 py-1 rounded-lg">
                {{ getTimeframeLabel() }}
              </span>
            </div>

            <!-- SVG Trend Chart -->
            <div class="h-48 w-full relative">
              <svg class="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="ounceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path [attr.d]="getSvgArea(getOunceSeries())" fill="url(#ounceGrad)"/>
                <path [attr.d]="getSvgPath(getOunceSeries())" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </div>

            <div class="flex items-center justify-between text-xs text-gray-400 border-t border-darkBorder pt-2">
              <span>أدنى: &#36;{{ getMin(getOunceSeries()) }}</span>
              <span>أعلى: &#36;{{ getMax(getOunceSeries()) }}</span>
            </div>
          </div>

          <!-- Graph 2: Gold 24K Price in Egyptian Pound (EGP) -->
          <div class="glass-card p-5 rounded-3xl border border-amber-500/30 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs text-amber-400 font-bold block">2. الذهب عيار 24 (مصر)</span>
                <h4 class="text-xl font-black text-amber-400">{{ apiService.goldPrices()?.gold24kEgp }} ج.م</h4>
              </div>
              <span class="bg-amber-400/10 text-amber-400 text-xs font-bold px-2.5 py-1 rounded-lg">
                {{ getTimeframeLabel() }}
              </span>
            </div>

            <!-- SVG Trend Chart -->
            <div class="h-48 w-full relative">
              <svg class="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gold24Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path [attr.d]="getSvgArea(getGold24kSeries())" fill="url(#gold24Grad)"/>
                <path [attr.d]="getSvgPath(getGold24kSeries())" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </div>

            <div class="flex items-center justify-between text-xs text-gray-400 border-t border-darkBorder pt-2">
              <span>أدنى: {{ getMin(getGold24kSeries()) }} ج.م</span>
              <span>أعلى: {{ getMax(getGold24kSeries()) }} ج.م</span>
            </div>
          </div>

          <!-- Graph 3: USD / EGP Exchange Rate -->
          <div class="glass-card p-5 rounded-3xl border border-emeraldAccent/30 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs text-emeraldAccent font-bold block">3. سعر صرف الدولار (USD/EGP)</span>
                <h4 class="text-xl font-black text-white">{{ apiService.goldPrices()?.usdEgpRate }} ج.م</h4>
              </div>
              <span class="bg-emeraldAccent/10 text-emeraldAccent text-xs font-bold px-2.5 py-1 rounded-lg">
                {{ getTimeframeLabel() }}
              </span>
            </div>

            <!-- SVG Trend Chart -->
            <div class="h-48 w-full relative">
              <svg class="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="usdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.4"/>
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path [attr.d]="getSvgArea(getUsdEgpSeries())" fill="url(#usdGrad)"/>
                <path [attr.d]="getSvgPath(getUsdEgpSeries())" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </div>

            <div class="flex items-center justify-between text-xs text-gray-400 border-t border-darkBorder pt-2">
              <span>أدنى: {{ getMin(getUsdEgpSeries()) }} ج.م</span>
              <span>أعلى: {{ getMax(getUsdEgpSeries()) }} ج.م</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GoldTrackerComponent {
  public apiService = inject(StockApiService);
  public selectedTimeframe = signal<Timeframe>('1M');

  public timeframes: { id: Timeframe; label: string }[] = [
    { id: '1D', label: 'يوم (1D)' },
    { id: '1W', label: 'أسبوع (1W)' },
    { id: '1M', label: 'شهر (1M)' },
    { id: '3M', label: '3 أشهر (3M)' },
    { id: '6M', label: '6 أشهر (6M)' },
    { id: '9M', label: '9 أشهر (9M)' },
    { id: '1Y', label: 'سنة (1Y)' }
  ];

  setTimeframe(tf: Timeframe) {
    this.selectedTimeframe.set(tf);
  }

  getTimeframeLabel(): string {
    const found = this.timeframes.find(t => t.id === this.selectedTimeframe());
    return found ? found.label : 'شهر (1M)';
  }

  private sliceByTimeframe(data: number[]): number[] {
    if (!data || data.length === 0) return [];
    const len = data.length;

    switch (this.selectedTimeframe()) {
      case '1D':
        return data.slice(Math.max(0, len - 2));
      case '1W':
        return data.slice(Math.max(0, len - 7));
      case '1M':
        return data.slice(Math.max(0, len - 22));
      case '3M':
        return data.slice(Math.max(0, len - 65));
      case '6M':
        return data.slice(Math.max(0, len - 130));
      case '9M':
        return data.slice(Math.max(0, len - 190));
      case '1Y':
      default:
        return data;
    }
  }

  getOunceSeries(): number[] {
    const raw = this.apiService.goldPrices()?.charts?.ounceSeries;
    if (raw && raw.length > 0) return this.sliceByTimeframe(raw);
    const base = this.apiService.goldPrices()?.goldUsdPerOz || 4048.58;
    return this.sliceByTimeframe([base * 0.95, base * 0.96, base * 0.98, base * 0.97, base * 0.99, base]);
  }

  getGold24kSeries(): number[] {
    const raw = this.apiService.goldPrices()?.charts?.gold24kSeries;
    if (raw && raw.length > 0) return this.sliceByTimeframe(raw);
    const base = this.apiService.goldPrices()?.gold24kEgp || 6828;
    return this.sliceByTimeframe([base * 0.95, base * 0.96, base * 0.98, base * 0.97, base * 0.99, base]);
  }

  getUsdEgpSeries(): number[] {
    const raw = this.apiService.goldPrices()?.charts?.usdEgpSeries;
    if (raw && raw.length > 0) return this.sliceByTimeframe(raw);
    const base = this.apiService.goldPrices()?.usdEgpRate || 51.07;
    return this.sliceByTimeframe([base * 0.99, base * 0.993, base * 0.995, base * 0.998, base * 1.0, base]);
  }

  getMin(data: number[]): number {
    if (!data || data.length === 0) return 0;
    return Math.min(...data);
  }

  getMax(data: number[]): number {
    if (!data || data.length === 0) return 0;
    return Math.max(...data);
  }

  getSvgPath(data: number[], width: number = 600, height: number = 180): string {
    if (!data || data.length < 2) {
      if (data.length === 1) return `M 0,${(height / 2).toFixed(1)} L ${width},${(height / 2).toFixed(1)}`;
      return '';
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) || 1;

    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 30) - 15;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  }

  getSvgArea(data: number[], width: number = 600, height: number = 180): string {
    const line = this.getSvgPath(data, width, height);
    if (!line) return '';
    return `${line} L ${width},${height} L 0,${height} Z`;
  }
}
