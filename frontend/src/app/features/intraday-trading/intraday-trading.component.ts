import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StockApiService } from '../../core/services/stock-api.service';
import { StockModalComponent } from '../../shared/components/stock-modal/stock-modal.component';
import { StockAnalysisResult, SignalType } from '../../core/models/stock.model';

type IntradayFilter = 'ALL' | 'BUY' | 'SELL';

@Component({
  selector: 'app-intraday-trading',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StockModalComponent],
  template: `
    <div class="space-y-6 pb-12">
      <!-- Page Header Banner -->
      <div class="relative overflow-hidden glass-card rounded-3xl p-6 sm:p-8 border border-orange-400/20">
        <div class="absolute -top-24 -left-24 w-72 h-72 bg-orange-400/15 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl"></div>

        <div class="relative z-10 max-w-3xl space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 border border-orange-500/30 text-orange-300">
            <span class="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
            ⚡ تحليل لحظي للزخم وحجم التداول داخل الجلسة
          </div>

          <h2 class="text-2xl sm:text-3xl font-black text-white leading-tight">
            توصيات المضاربة داخل الجلسة
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300">
              (Intraday Session Trading)
            </span>
          </h2>

          <p class="text-gray-300 text-sm leading-relaxed">
            تحليل آلي لحظي لأفضل فرص المضاربة اليومية — أسهم الشراء السريع وإشارات البيع داخل جلسة التداول مع نقاط الدخول والأهداف ووقف الخسارة.
          </p>
        </div>
      </div>

      <!-- Quick Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card p-4 rounded-2xl border-l-4 border-l-emeraldAccent">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold mb-1.5">
            <span>إشارات شراء مضاربة</span>
            <i class="pi pi-arrow-up text-emeraldAccent text-lg"></i>
          </div>
          <div class="text-2xl font-black text-emeraldAccent">{{ allIntradayBuys().length }}</div>
          <span class="text-xs text-gray-400 block mt-0.5">أسهم حلال فقط</span>
        </div>

        <div class="glass-card p-4 rounded-2xl border-l-4 border-l-roseAccent">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold mb-1.5">
            <span>إشارات بيع / تجنب</span>
            <i class="pi pi-arrow-down text-roseAccent text-lg"></i>
          </div>
          <div class="text-2xl font-black text-roseAccent">{{ allIntradaySells().length }}</div>
          <span class="text-xs text-gray-400 block mt-0.5">أسهم حلال فقط</span>
        </div>

        <div class="glass-card p-4 rounded-2xl border-l-4 border-l-amberAccent">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold mb-1.5">
            <span>إشارات محايدة</span>
            <i class="pi pi-minus-circle text-amberAccent text-lg"></i>
          </div>
          <div class="text-2xl font-black text-amberAccent">{{ allIntradayNeutral().length }}</div>
          <span class="text-xs text-gray-400 block mt-0.5">انتظر تكون الزخم</span>
        </div>

        <div class="glass-card p-4 rounded-2xl border-l-4 border-l-cyanAccent">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold mb-1.5">
            <span>إجمالي الأسهم المتابعة</span>
            <i class="pi pi-chart-line text-cyanAccent text-lg"></i>
          </div>
          <div class="text-2xl font-black text-white">{{ apiService.stocks().length }}</div>
          <span class="text-xs text-gray-400 block mt-0.5">البورصة المصرية EGX</span>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex items-center gap-2 flex-wrap">
        <button (click)="activeFilter.set('ALL')"
                [class]="activeFilter() === 'ALL' ? 'bg-orange-500 text-black font-black shadow-lg shadow-orange-500/20' : 'bg-darkCard text-gray-300 hover:bg-darkBorder border border-darkBorder'"
                class="px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2">
          <i class="pi pi-list"></i>
          الكل ({{ allIntradayBuys().length + allIntradaySells().length + allIntradayNeutral().length }})
        </button>
        <button (click)="activeFilter.set('BUY')"
                [class]="activeFilter() === 'BUY' ? 'bg-emerald-500 text-black font-black shadow-lg shadow-emerald-500/20' : 'bg-darkCard text-gray-300 hover:bg-darkBorder border border-darkBorder'"
                class="px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2">
          <i class="pi pi-arrow-up"></i>
          🟢 شراء ({{ allIntradayBuys().length }})
        </button>
        <button (click)="activeFilter.set('SELL')"
                [class]="activeFilter() === 'SELL' ? 'bg-rose-500 text-black font-black shadow-lg shadow-rose-500/20' : 'bg-darkCard text-gray-300 hover:bg-darkBorder border border-darkBorder'"
                class="px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2">
          <i class="pi pi-arrow-down"></i>
          🔴 بيع ({{ allIntradaySells().length }})
        </button>

        <!-- Search -->
        <div class="flex-1 min-w-[180px] max-w-xs mr-auto">
          <div class="relative">
            <i class="pi pi-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
            <input type="text" [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)"
                   placeholder="بحث باسم أو رمز السهم..."
                   class="w-full bg-darkCard border border-darkBorder rounded-xl py-2.5 pr-9 pl-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-400/50 transition-colors" />
          </div>
        </div>
      </div>

      <!-- ===== BUY SECTION ===== -->
      <div *ngIf="activeFilter() === 'ALL' || activeFilter() === 'BUY'" class="space-y-4">
        <h3 class="text-lg font-black text-white flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-emeraldAccent"></span>
          ↑ 🟢 أفضل أسهم للمضاربة الشراء داخل الجلسة
          <span class="text-xs text-gray-400 font-normal">({{ filteredBuys().length }} سهم)</span>
        </h3>

        <div *ngIf="filteredBuys().length === 0" class="glass-card p-8 rounded-2xl text-center text-sm text-gray-400">
          <div class="text-3xl mb-2">📊</div>
          {{ searchTerm() ? 'لا توجد نتائج تطابق البحث' : 'لا توجد فرص مضاربة شراء قوية في الجلسة الحالية - انتظر تكون الزخم' }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div *ngFor="let stock of filteredBuys()"
               (click)="selectStock(stock)"
               class="glass-card p-5 rounded-2xl hover:border-emeraldAccent/50 transition-all cursor-pointer group space-y-3 border-l-4 border-l-emeraldAccent">
            <!-- Header Row -->
            <div class="flex items-center justify-between">
              <span class="font-black text-white text-base group-hover:text-emeraldAccent transition-colors">
                {{ stock.quote.symbol }}
              </span>
              <span [class]="getIntradaySignalBadgeClass(stock.intradaySignal!)" class="text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1">
                <i class="pi pi-pencil text-[10px]"></i>
                {{ getIntradaySignalLabel(stock.intradaySignal!) }}
              </span>
            </div>

            <!-- Name & Price -->
            <div>
              <h4 class="text-xs text-gray-300 font-semibold truncate">{{ stock.quote.nameAr || stock.quote.nameEn }}</h4>
              <div class="flex items-baseline justify-between mt-2">
                <span class="text-xl font-black text-white">{{ stock.quote.currentPrice }} <small class="text-xs font-normal">ج.م</small></span>
                <span [class]="stock.quote.changePercent >= 0 ? 'text-emeraldAccent' : 'text-roseAccent'" class="text-xs font-bold">
                  {{ stock.quote.changePercent >= 0 ? '+' : '' }}{{ stock.quote.changePercent }}%
                </span>
              </div>
            </div>

            <!-- Entry / Target / Stop Loss Grid -->
            <div class="pt-2 border-t border-darkBorder/60 grid grid-cols-3 gap-1 text-[10px] text-gray-400">
              <div class="text-center">
                <span class="block">دخول</span>
                <strong class="text-emeraldAccent text-xs">{{ stock.intradayEntry }}</strong>
              </div>
              <div class="text-center">
                <span class="block">هدف</span>
                <strong class="text-cyanAccent text-xs">{{ stock.intradayTarget }}</strong>
              </div>
              <div class="text-center">
                <span class="block">وقف</span>
                <strong class="text-roseAccent text-xs">{{ stock.intradayStopLoss }}</strong>
              </div>
            </div>

            <!-- Volume Info -->
            <div class="flex items-center justify-between text-[10px] text-gray-400 pt-1">
              <span>حجم التداول: <strong class="text-gray-200">{{ formatVolume(stock.quote.volume) }}</strong></span>
              <span [class]="stock.indicators.volumeSpike ? 'text-orange-400 font-bold' : ''">
                {{ stock.indicators.volumeRatio }}x المتوسط
                <span *ngIf="stock.indicators.volumeSpike">🔥</span>
              </span>
            </div>

            <!-- Reasons -->
            <div *ngIf="stock.intradayReasons && stock.intradayReasons.length > 0" class="space-y-1">
              <div *ngFor="let reason of stock.intradayReasons; let i = index" class="text-[10px] text-gray-400 truncate">
                <span class="text-orange-400">⚡</span> {{ reason }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== SELL SECTION ===== -->
      <div *ngIf="activeFilter() === 'ALL' || activeFilter() === 'SELL'" class="space-y-4">
        <h3 class="text-lg font-black text-white flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-roseAccent"></span>
          🔴 أسهم للمضاربة البيع / تجنب داخل الجلسة
          <span class="text-xs text-gray-400 font-normal">({{ filteredSells().length }} سهم)</span>
        </h3>

        <div *ngIf="filteredSells().length === 0" class="glass-card p-8 rounded-2xl text-center text-sm text-gray-400">
          <div class="text-3xl mb-2">✅</div>
          {{ searchTerm() ? 'لا توجد نتائج تطابق البحث' : 'لا توجد إشارات بيع قوية في الجلسة الحالية - السوق في وضع صاعد' }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div *ngFor="let stock of filteredSells()"
               (click)="selectStock(stock)"
               class="glass-card p-5 rounded-2xl hover:border-rose-400/50 transition-all cursor-pointer group space-y-3 border-l-4 border-l-roseAccent">
            <!-- Header Row -->
            <div class="flex items-center justify-between">
              <span class="font-black text-white text-base group-hover:text-rose-400 transition-colors">
                {{ stock.quote.symbol }}
              </span>
              <span [class]="getIntradaySignalBadgeClass(stock.intradaySignal!)" class="text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1">
                {{ getIntradaySignalLabel(stock.intradaySignal!) }}
              </span>
            </div>

            <!-- Name & Price -->
            <div>
              <h4 class="text-xs text-gray-300 font-semibold truncate">{{ stock.quote.nameAr || stock.quote.nameEn }}</h4>
              <div class="flex items-baseline justify-between mt-2">
                <span class="text-xl font-black text-white">{{ stock.quote.currentPrice }} <small class="text-xs font-normal">ج.م</small></span>
                <span [class]="stock.quote.changePercent >= 0 ? 'text-emeraldAccent' : 'text-roseAccent'" class="text-xs font-bold">
                  {{ stock.quote.changePercent >= 0 ? '+' : '' }}{{ stock.quote.changePercent }}%
                </span>
              </div>
            </div>

            <!-- Entry / Target / Stop Loss Grid -->
            <div class="pt-2 border-t border-darkBorder/60 grid grid-cols-3 gap-1 text-[10px] text-gray-400">
              <div class="text-center">
                <span class="block">دخول</span>
                <strong class="text-roseAccent text-xs">{{ stock.intradayEntry }}</strong>
              </div>
              <div class="text-center">
                <span class="block">هدف</span>
                <strong class="text-cyanAccent text-xs">{{ stock.intradayTarget }}</strong>
              </div>
              <div class="text-center">
                <span class="block">وقف</span>
                <strong class="text-emeraldAccent text-xs">{{ stock.intradayStopLoss }}</strong>
              </div>
            </div>

            <!-- Volume Info -->
            <div class="flex items-center justify-between text-[10px] text-gray-400 pt-1">
              <span>حجم التداول: <strong class="text-gray-200">{{ formatVolume(stock.quote.volume) }}</strong></span>
              <span [class]="stock.indicators.volumeSpike ? 'text-orange-400 font-bold' : ''">
                {{ stock.indicators.volumeRatio }}x المتوسط
                <span *ngIf="stock.indicators.volumeSpike">🔥</span>
              </span>
            </div>

            <!-- Reasons -->
            <div *ngIf="stock.intradayReasons && stock.intradayReasons.length > 0" class="space-y-1">
              <div *ngFor="let reason of stock.intradayReasons; let i = index" class="text-[10px] text-gray-400 truncate">
                <span class="text-rose-400">⚠️</span> {{ reason }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== NEUTRAL SECTION (only shown when filter is ALL) ===== -->
      <div *ngIf="activeFilter() === 'ALL' && filteredNeutral().length > 0" class="space-y-4">
        <h3 class="text-lg font-black text-white flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-amberAccent"></span>
          🟡 أسهم محايدة — انتظر تكون الزخم
          <span class="text-xs text-gray-400 font-normal">({{ filteredNeutral().length }} سهم)</span>
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div *ngFor="let stock of filteredNeutral()"
               (click)="selectStock(stock)"
               class="glass-card p-5 rounded-2xl hover:border-amber-400/50 transition-all cursor-pointer group space-y-3 border-l-4 border-l-amberAccent opacity-80 hover:opacity-100">
            <div class="flex items-center justify-between">
              <span class="font-black text-white text-base group-hover:text-amber-400 transition-colors">
                {{ stock.quote.symbol }}
              </span>
              <span class="bg-amber-500/15 text-amber-300 border-amber-500/20 text-xs font-bold px-2.5 py-0.5 rounded-full border">
                🟡 محايد
              </span>
            </div>

            <div>
              <h4 class="text-xs text-gray-300 font-semibold truncate">{{ stock.quote.nameAr || stock.quote.nameEn }}</h4>
              <div class="flex items-baseline justify-between mt-2">
                <span class="text-xl font-black text-white">{{ stock.quote.currentPrice }} <small class="text-xs font-normal">ج.م</small></span>
                <span [class]="stock.quote.changePercent >= 0 ? 'text-emeraldAccent' : 'text-roseAccent'" class="text-xs font-bold">
                  {{ stock.quote.changePercent >= 0 ? '+' : '' }}{{ stock.quote.changePercent }}%
                </span>
              </div>
            </div>

            <div class="pt-2 border-t border-darkBorder/60 grid grid-cols-3 gap-1 text-[10px] text-gray-400">
              <div class="text-center">
                <span class="block">دخول</span>
                <strong class="text-amberAccent text-xs">{{ stock.intradayEntry || '-' }}</strong>
              </div>
              <div class="text-center">
                <span class="block">هدف</span>
                <strong class="text-cyanAccent text-xs">{{ stock.intradayTarget || '-' }}</strong>
              </div>
              <div class="text-center">
                <span class="block">وقف</span>
                <strong class="text-roseAccent text-xs">{{ stock.intradayStopLoss || '-' }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Disclaimer -->
      <div class="glass-card p-4 rounded-2xl text-xs text-gray-400 border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
        <i class="pi pi-exclamation-triangle text-amberAccent text-lg mt-0.5"></i>
        <div class="space-y-1">
          <p class="font-bold text-amber-300">⚠️ تحذير هام — المضاربة اليومية عالية المخاطر</p>
          <p>توصيات المضاربة داخل الجلسة (Intraday/Scalping) مبنية على تحليل فني آلي لحظي. المضاربة اليومية تتطلب خبرة متقدمة وإدارة مخاطر صارمة. التزم بوقف الخسارة ولا تبيت بمراكز المضاربة. هذه ليست نصيحة مالية — استشر مستشارك المالي المعتمد.</p>
        </div>
      </div>

      <!-- Detail Modal -->
      <app-stock-modal [(visible)]="modalVisible" [stock]="selectedStock"></app-stock-modal>
    </div>
  `
})
export class IntradayTradingComponent {
  public apiService = inject(StockApiService);
  public modalVisible = false;
  public selectedStock: StockAnalysisResult | null = null;

  public activeFilter = signal<IntradayFilter>('ALL');
  public searchTerm = signal<string>('');

  // ─── Computed lists: ALL intraday stocks (not limited to top 4 like dashboard) ───
  private isHalalOnly = (s: StockAnalysisResult) => s.shariaTier !== 'NON_COMPLIANT';

  allIntradayBuys = computed(() => {
    const sorted = [...this.apiService.stocks()].sort((a, b) => (b.intradayScore || 0) - (a.intradayScore || 0));
    return sorted.filter(s => this.isHalalOnly(s) && (s.intradaySignal === 'BUY' || s.intradaySignal === 'STRONG_BUY'));
  });

  allIntradaySells = computed(() => {
    const sorted = [...this.apiService.stocks()].sort((a, b) => (a.intradayScore || 0) - (b.intradayScore || 0));
    return sorted.filter(s => this.isHalalOnly(s) && (s.intradaySignal === 'SELL' || s.intradaySignal === 'STRONG_SELL'));
  });

  allIntradayNeutral = computed(() => {
    const sorted = [...this.apiService.stocks()].sort((a, b) => (b.intradayScore || 0) - (a.intradayScore || 0));
    return sorted.filter(s => this.isHalalOnly(s) && (s.intradaySignal === 'NEUTRAL' || !s.intradaySignal));
  });

  // ─── Filtered lists (with search) ───
  private matchesSearch(stock: StockAnalysisResult): boolean {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return true;
    return stock.quote.symbol.toLowerCase().includes(term) ||
           (stock.quote.nameAr || '').includes(term) ||
           (stock.quote.nameEn || '').toLowerCase().includes(term);
  }

  filteredBuys = computed(() => this.allIntradayBuys().filter(s => this.matchesSearch(s)));
  filteredSells = computed(() => this.allIntradaySells().filter(s => this.matchesSearch(s)));
  filteredNeutral = computed(() => this.allIntradayNeutral().filter(s => this.matchesSearch(s)));

  selectStock(stock: StockAnalysisResult) {
    this.selectedStock = stock;
    this.modalVisible = true;
  }

  formatVolume(vol: number): string {
    if (!vol) return '0';
    if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + 'M';
    if (vol >= 1_000) return (vol / 1_000).toFixed(0) + 'K';
    return vol.toString();
  }

  getIntradaySignalLabel(signal: SignalType): string {
    switch (signal) {
      case 'STRONG_BUY': return '🚀 شراء قوي';
      case 'BUY': return '🟢 شراء';
      case 'NEUTRAL': return '🟡 محايد';
      case 'SELL': return '🔴 بيع';
      case 'STRONG_SELL': return '🚨 بيع قوي';
      default: return '🟡 محايد';
    }
  }

  getIntradaySignalBadgeClass(signal: SignalType): string {
    switch (signal) {
      case 'STRONG_BUY': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'BUY': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
      case 'NEUTRAL': return 'bg-amber-500/15 text-amber-300 border-amber-500/20';
      case 'SELL': return 'bg-rose-500/15 text-rose-300 border-rose-500/20';
      case 'STRONG_SELL': return 'bg-rose-500/25 text-rose-200 border-rose-500/40';
      default: return 'bg-amber-500/15 text-amber-300 border-amber-500/20';
    }
  }
}
