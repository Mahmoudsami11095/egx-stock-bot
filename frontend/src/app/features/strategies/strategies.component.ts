import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StockApiService } from '../../core/services/stock-api.service';
import { StockModalComponent } from '../../shared/components/stock-modal/stock-modal.component';
import { StockAnalysisResult } from '../../core/models/stock.model';

type StrategyTab = 'SHORT_TERM' | 'LONG_TERM';

@Component({
  selector: 'app-strategies',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, StockModalComponent],
  template: `
    <div class="space-y-6 pb-12">
      <!-- Page Header Banner -->
      <div class="relative overflow-hidden glass-card rounded-3xl p-6 sm:p-8 border border-blue-400/20">
        <div class="absolute -top-24 -left-24 w-72 h-72 bg-blue-400/15 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl"></div>

        <div class="relative z-10 max-w-3xl space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 border border-blue-500/30 text-blue-300">
            <i class="pi pi-briefcase text-blue-400"></i>
            التوصيات الاستراتيجية للمحترفين
          </div>

          <h2 class="text-2xl sm:text-3xl font-black text-white leading-tight">
            خطط التداول والاستثمار
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              (Professional Strategies)
            </span>
          </h2>

          <p class="text-gray-300 text-sm leading-relaxed">
            استكشف أفضل الفرص الاستثمارية بناءً على أفقك الزمني. سواء كنت تبحث عن تداولات متوسطة الأجل تعتمد على الزخم الفني، أو استثمارات طويلة الأجل مبنية على القيم العادلة للشركات.
          </p>
        </div>
      </div>

      <!-- Quick Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card p-4 rounded-2xl border-l-4 border-l-emerald-500">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold mb-1.5">
            <span>فرص تجميع (مدى قصير)</span>
            <i class="pi pi-clock text-emerald-500 text-lg"></i>
          </div>
          <div class="text-2xl font-black text-emerald-400">{{ shortTermBuys().length }}</div>
          <span class="text-xs text-gray-400 block mt-0.5">زخم فني إيجابي</span>
        </div>

        <div class="glass-card p-4 rounded-2xl border-l-4 border-l-purple-500">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold mb-1.5">
            <span>فرص استثمار (مدى طويل)</span>
            <i class="pi pi-chart-pie text-purple-500 text-lg"></i>
          </div>
          <div class="text-2xl font-black text-purple-400">{{ longTermBuys().length }}</div>
          <span class="text-xs text-gray-400 block mt-0.5">أقل من القيمة العادلة</span>
        </div>

        <div class="glass-card p-4 rounded-2xl border-l-4 border-l-amber-500">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold mb-1.5">
            <span>تخفيف مراكز</span>
            <i class="pi pi-exclamation-triangle text-amber-500 text-lg"></i>
          </div>
          <div class="text-2xl font-black text-amber-400">{{ reducingPositions().length }}</div>
          <span class="text-xs text-gray-400 block mt-0.5">أسهم وصلت للهدف أو مبالغ فيها</span>
        </div>
        
        <div class="glass-card p-4 rounded-2xl border-l-4 border-l-cyanAccent">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold mb-1.5">
            <span>إجمالي الأسهم المحللة</span>
            <i class="pi pi-verified text-cyanAccent text-lg"></i>
          </div>
          <div class="text-2xl font-black text-white">{{ apiService.stocks().length }}</div>
          <span class="text-xs text-gray-400 block mt-0.5">البورصة المصرية EGX</span>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex flex-col sm:flex-row items-center gap-3">
        <div class="flex items-center gap-2 p-1 bg-darkCard/80 border border-darkBorder rounded-2xl w-full sm:w-auto overflow-x-auto">
          <button (click)="activeTab.set('SHORT_TERM')"
                  [class]="activeTab() === 'SHORT_TERM' ? 'bg-emerald-500/20 text-emerald-300 font-bold border-emerald-500/30' : 'text-gray-400 hover:text-white border-transparent hover:bg-darkBorder'"
                  class="px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 border whitespace-nowrap flex-1 sm:flex-none justify-center">
            <i class="pi pi-stopwatch"></i>
            المدى القصير (1 - 3 أشهر)
          </button>
          <button (click)="activeTab.set('LONG_TERM')"
                  [class]="activeTab() === 'LONG_TERM' ? 'bg-purple-500/20 text-purple-300 font-bold border-purple-500/30' : 'text-gray-400 hover:text-white border-transparent hover:bg-darkBorder'"
                  class="px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 border whitespace-nowrap flex-1 sm:flex-none justify-center">
            <i class="pi pi-calendar"></i>
            المدى الطويل (1 - 3 سنوات)
          </button>
        </div>

        <!-- Search -->
        <div class="flex-1 min-w-[180px] w-full sm:max-w-xs mr-auto">
          <div class="relative">
            <i class="pi pi-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
            <input type="text" [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)"
                   placeholder="بحث باسم أو رمز السهم..."
                   class="w-full bg-darkCard border border-darkBorder rounded-xl py-2.5 pr-9 pl-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-400/50 transition-colors" />
          </div>
        </div>
      </div>

      <!-- ===== SHORT TERM SECTION ===== -->
      <div *ngIf="activeTab() === 'SHORT_TERM'" class="space-y-4 animate-fade-in">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
          <div>
            <h3 class="text-lg font-black text-white">الأسهم المرشحة للمدى القصير (Swing Trading)</h3>
            <p class="text-xs text-gray-400">تعتمد على المؤشرات الفنية للزخم، المتوسطات المتحركة، والانعكاسات السعرية.</p>
          </div>
        </div>

        <div *ngIf="filteredShortTerm().length === 0" class="glass-card p-8 rounded-2xl text-center text-sm text-gray-400">
          <div class="text-3xl mb-2">📊</div>
          {{ searchTerm() ? 'لا توجد نتائج تطابق البحث' : 'لا توجد فرص تجميع فنية واضحة حالياً' }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div *ngFor="let stock of filteredShortTerm()"
               (click)="selectStock(stock)"
               class="glass-card p-5 rounded-2xl hover:border-emerald-500/50 transition-all cursor-pointer group space-y-3 border-t-4"
               [ngClass]="stock.shortTermRec?.action === 'جني أرباح جزئي (Take Profit)' ? 'border-t-rose-500' : 'border-t-emerald-500'">
            
            <!-- Header Row -->
            <div class="flex items-start justify-between">
              <div>
                <span class="font-black text-white text-base group-hover:text-emerald-400 transition-colors">
                  {{ stock.quote.symbol }}
                </span>
                <h4 class="text-[10px] text-gray-400 font-semibold truncate max-w-[140px]" [title]="stock.quote.nameAr || stock.quote.nameEn">
                  {{ stock.quote.nameAr || stock.quote.nameEn }}
                </h4>
              </div>
              <span [class]="getShortTermBadgeClass(stock.shortTermRec?.action!)" class="text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap">
                {{ stock.shortTermRec?.badge }}
              </span>
            </div>

            <!-- Price & Action -->
            <div class="py-2">
              <div class="flex items-baseline justify-between mb-1">
                <span class="text-xl font-black text-white">{{ stock.quote.currentPrice }} <small class="text-[10px] font-normal text-gray-400">ج.م</small></span>
                <span [class]="stock.quote.changePercent >= 0 ? 'text-emeraldAccent' : 'text-roseAccent'" class="text-xs font-bold">
                  {{ stock.quote.changePercent >= 0 ? '+' : '' }}{{ stock.quote.changePercent }}%
                </span>
              </div>
              <p class="text-[11px] font-bold" [ngClass]="stock.shortTermRec?.action === 'جني أرباح جزئي (Take Profit)' ? 'text-rose-400' : 'text-emerald-400'">
                القرار: {{ stock.shortTermRec?.action }}
              </p>
            </div>

            <!-- Targets -->
            <div class="pt-2 border-t border-darkBorder/60 grid grid-cols-2 gap-2 text-xs">
              <div class="bg-darkBg/50 p-2 rounded-lg border border-darkBorder">
                <span class="block text-[9px] text-gray-500 font-bold mb-0.5">الهدف المتوقع</span>
                <strong class="text-cyanAccent">{{ stock.shortTermRec?.targetPrice }}</strong>
              </div>
              <div class="bg-darkBg/50 p-2 rounded-lg border border-darkBorder">
                <span class="block text-[9px] text-gray-500 font-bold mb-0.5">وقف الخسارة</span>
                <strong class="text-roseAccent">{{ stock.shortTermRec?.stopLoss }}</strong>
              </div>
            </div>

            <!-- Reason -->
            <div class="pt-1">
              <p class="text-[10px] text-gray-400 leading-snug line-clamp-2" [title]="stock.shortTermRec?.reason">
                {{ stock.shortTermRec?.reason }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== LONG TERM SECTION ===== -->
      <div *ngIf="activeTab() === 'LONG_TERM'" class="space-y-4 animate-fade-in">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-1.5 h-6 bg-purple-500 rounded-full"></div>
          <div>
            <h3 class="text-lg font-black text-white">الأسهم المرشحة للمدى الطويل (Value Investing)</h3>
            <p class="text-xs text-gray-400">تعتمد على الفجوة بين القيمة العادلة للشركة (Intrinsic Value) وسعرها السوقي الحالي.</p>
          </div>
        </div>

        <div *ngIf="filteredLongTerm().length === 0" class="glass-card p-8 rounded-2xl text-center text-sm text-gray-400">
          <div class="text-3xl mb-2">💎</div>
          {{ searchTerm() ? 'لا توجد نتائج تطابق البحث' : 'السوق مبالغ في تقييمه حالياً - لا توجد فرص شراء واضحة بناءً على الأساسيات' }}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div *ngFor="let stock of filteredLongTerm()"
               (click)="selectStock(stock)"
               class="glass-card p-5 rounded-2xl hover:border-purple-500/50 transition-all cursor-pointer group space-y-3 border-t-4"
               [ngClass]="stock.longTermRec?.action === 'تخفيف مراكز (Reduce)' ? 'border-t-rose-500' : 'border-t-purple-500'">
            
            <!-- Header Row -->
            <div class="flex items-start justify-between">
              <div>
                <span class="font-black text-white text-base group-hover:text-purple-400 transition-colors">
                  {{ stock.quote.symbol }}
                </span>
                <h4 class="text-[10px] text-gray-400 font-semibold truncate max-w-[140px]" [title]="stock.quote.nameAr || stock.quote.nameEn">
                  {{ stock.quote.nameAr || stock.quote.nameEn }}
                </h4>
              </div>
              <span [class]="getLongTermBadgeClass(stock.longTermRec?.action!)" class="text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap">
                {{ stock.longTermRec?.badge }}
              </span>
            </div>

            <!-- Price & Action -->
            <div class="py-2">
              <div class="flex items-baseline justify-between mb-1">
                <span class="text-xl font-black text-white">{{ stock.quote.currentPrice }} <small class="text-[10px] font-normal text-gray-400">ج.م</small></span>
                <span [class]="stock.quote.changePercent >= 0 ? 'text-emeraldAccent' : 'text-roseAccent'" class="text-xs font-bold">
                  {{ stock.quote.changePercent >= 0 ? '+' : '' }}{{ stock.quote.changePercent }}%
                </span>
              </div>
              <p class="text-[11px] font-bold" [ngClass]="stock.longTermRec?.action === 'تخفيف مراكز (Reduce)' ? 'text-rose-400' : 'text-purple-400'">
                القرار: {{ stock.longTermRec?.action }}
              </p>
            </div>

            <!-- Targets -->
            <div class="pt-2 border-t border-darkBorder/60 grid grid-cols-2 gap-2 text-xs">
              <div class="bg-darkBg/50 p-2 rounded-lg border border-darkBorder">
                <span class="block text-[9px] text-gray-500 font-bold mb-0.5">القيمة العادلة المستهدفة</span>
                <strong class="text-emeraldAccent">{{ stock.longTermRec?.targetPrice }} <small class="text-[9px]">ج.م</small></strong>
              </div>
              <div class="bg-darkBg/50 p-2 rounded-lg border border-darkBorder">
                <span class="block text-[9px] text-gray-500 font-bold mb-0.5">نمو رأس المال</span>
                <strong [class]="stock.fairValueUpsidePercent >= 0 ? 'text-amberAccent' : 'text-roseAccent'">
                  {{ stock.fairValueUpsidePercent >= 0 ? '+' : '' }}{{ stock.fairValueUpsidePercent }}%
                </strong>
              </div>
            </div>

            <!-- Reason -->
            <div class="pt-1">
              <p class="text-[10px] text-gray-400 leading-snug line-clamp-2" [title]="stock.longTermRec?.reason">
                {{ stock.longTermRec?.reason }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Modal -->
      <app-stock-modal [(visible)]="modalVisible" [stock]="selectedStock"></app-stock-modal>
    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class StrategiesComponent {
  public apiService = inject(StockApiService);
  public modalVisible = false;
  public selectedStock: StockAnalysisResult | null = null;

  public activeTab = signal<StrategyTab>('SHORT_TERM');
  public searchTerm = signal<string>('');

  private isHalalOnly = (s: StockAnalysisResult) => s.shariaTier !== 'NON_COMPLIANT';

  // Stats Data
  shortTermBuys = computed(() => {
    return this.apiService.stocks().filter(s => this.isHalalOnly(s) && s.shortTermRec && s.shortTermRec.action === 'تجميع فني (Buy/Accumulate)');
  });

  longTermBuys = computed(() => {
    return this.apiService.stocks().filter(s => this.isHalalOnly(s) && s.longTermRec && (s.longTermRec.action === 'استثمار طويل الأجل (Strong Buy)' || s.longTermRec.action === 'تجميع استثماري (Accumulate)'));
  });

  reducingPositions = computed(() => {
    return this.apiService.stocks().filter(s => this.isHalalOnly(s) && ((s.shortTermRec && s.shortTermRec.action === 'جني أرباح جزئي (Take Profit)') || (s.longTermRec && s.longTermRec.action === 'تخفيف مراكز (Reduce)')));
  });

  // Filtered Lists for UI
  private matchesSearch(stock: StockAnalysisResult): boolean {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return true;
    return stock.quote.symbol.toLowerCase().includes(term) ||
           (stock.quote.nameAr || '').includes(term) ||
           (stock.quote.nameEn || '').toLowerCase().includes(term);
  }

  filteredShortTerm = computed(() => {
    const activeStocks = this.apiService.stocks().filter(s => this.isHalalOnly(s) && s.shortTermRec && (s.shortTermRec.action === 'تجميع فني (Buy/Accumulate)' || s.shortTermRec.action === 'جني أرباح جزئي (Take Profit)'));
    return activeStocks.filter(s => this.matchesSearch(s));
  });

  filteredLongTerm = computed(() => {
    const activeStocks = this.apiService.stocks().filter(s => this.isHalalOnly(s) && s.longTermRec && (s.longTermRec.action === 'استثمار طويل الأجل (Strong Buy)' || s.longTermRec.action === 'تجميع استثماري (Accumulate)' || s.longTermRec.action === 'تخفيف مراكز (Reduce)'));
    // Sort by highest upside
    const sorted = [...activeStocks].sort((a, b) => b.fairValueUpsidePercent - a.fairValueUpsidePercent);
    return sorted.filter(s => this.matchesSearch(s));
  });

  selectStock(stock: StockAnalysisResult) {
    this.selectedStock = stock;
    this.modalVisible = true;
  }

  getShortTermBadgeClass(action: string): string {
    if (action.includes('تجميع')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (action.includes('جني')) return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    if (action.includes('ترقب')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }

  getLongTermBadgeClass(action: string): string {
    if (action.includes('استثمار')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    if (action.includes('تجميع')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (action.includes('تخفيف')) return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
}
