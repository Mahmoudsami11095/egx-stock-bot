import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { StockApiService } from '../../core/services/stock-api.service';
import { StockModalComponent } from '../../shared/components/stock-modal/stock-modal.component';
import { StockAnalysisResult, SignalType } from '../../core/models/stock.model';

@Component({
  selector: 'app-stock-screener',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, DropdownModule, StockModalComponent],
  template: `
    <div class="space-y-6 pb-12">
      <!-- Page Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            📈 جدول فحص أسهم البورصة المصرية الحلال (EGX Stock Screener)
          </h2>
          <p class="text-xs sm:text-sm text-gray-400">مرتبة أوتوماتيكياً حسب أعلى فارق للقيمة العادلة ونسب النمو المتوقعة</p>
        </div>

        <div class="flex items-center gap-2">
          <a href="https://docs.google.com/spreadsheets/d/17anSf-cjckoBaV3jhBD5IscwxONGKu79W3ekTSq8lck/edit?gid=0#gid=0"
             target="_blank" rel="noopener"
             class="bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
            <i class="pi pi-external-link"></i> فتح Google Sheet أونلاين
          </a>
        </div>
      </div>

      <!-- Search & Filtering Bar -->
      <div class="glass-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[240px]">
          <i class="pi pi-search absolute right-3 top-3.5 text-gray-400 text-sm"></i>
          <input type="text"
                 [(ngModel)]="searchQuery"
                 placeholder="بحث برمز السهم أو الاسم (مثال: MPCI, AMOC, السويدى)..."
                 class="w-full bg-darkBg/90 border border-darkBorder rounded-xl pr-9 pl-4 py-2.5 text-sm text-white focus:outline-none focus:border-emeraldAccent transition-colors">
        </div>

        <!-- Filter Chips -->
        <div class="flex flex-wrap items-center gap-2">
          <button (click)="activeFilter.set('ALL')"
                  [class]="activeFilter() === 'ALL' ? 'bg-emeraldAccent text-black font-bold' : 'bg-darkCard text-gray-300 hover:bg-darkBorder'"
                  class="px-3.5 py-2 rounded-xl text-xs transition-all border border-darkBorder">
            الكل ({{ apiService.stocks().length }})
          </button>
          <button (click)="activeFilter.set('BUY')"
                  [class]="activeFilter() === 'BUY' ? 'bg-emeraldAccent text-black font-bold' : 'bg-darkCard text-gray-300 hover:bg-darkBorder'"
                  class="px-3.5 py-2 rounded-xl text-xs transition-all border border-darkBorder">
            🚀 توصيات الشراء ({{ buyCount() }})
          </button>
          <button (click)="activeFilter.set('UNDERVALUED')"
                  [class]="activeFilter() === 'UNDERVALUED' ? 'bg-emeraldAccent text-black font-bold' : 'bg-darkCard text-gray-300 hover:bg-darkBorder'"
                  class="px-3.5 py-2 rounded-xl text-xs transition-all border border-darkBorder">
            💎 ألمع فرص النمو (+15% فأكثر)
          </button>
        </div>
      </div>

      <!-- PrimeNG Data Table -->
      <div class="glass-card rounded-2xl overflow-hidden border border-darkBorder">
        <p-table [value]="filteredStocks()"
                 [paginator]="true"
                 [rows]="15"
                 [rowsPerPageOptions]="[10, 15, 25, 50]"
                 styleClass="p-datatable-sm"
                 responsiveLayout="scroll">

          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="quote.symbol">السهم <p-sortIcon field="quote.symbol"></p-sortIcon></th>
              <th pSortableColumn="quote.currentPrice">السعر اللحظي <p-sortIcon field="quote.currentPrice"></p-sortIcon></th>
              <th pSortableColumn="fairValue">القيمة العادلة <p-sortIcon field="fairValue"></p-sortIcon></th>
              <th pSortableColumn="fairValueUpsidePercent">فارق النمو المتوقع <p-sortIcon field="fairValueUpsidePercent"></p-sortIcon></th>
              <th pSortableColumn="signalType">التوصية والإشارة <p-sortIcon field="signalType"></p-sortIcon></th>
              <th pSortableColumn="indicators.rsi">RSI(14) <p-sortIcon field="indicators.rsi"></p-sortIcon></th>
              <th>التوافق الشرعي</th>
              <th>التفاصيل</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-stock>
            <tr (click)="openDetailModal(stock)" class="cursor-pointer hover:bg-darkBorder/50 transition-colors">
              <!-- Symbol & Name -->
              <td>
                <div class="font-black text-white text-sm">{{ stock.quote.symbol }}</div>
                <div class="text-xs text-gray-400 truncate max-w-[160px]">{{ stock.quote.nameAr }}</div>
              </td>

              <!-- Price & Change -->
              <td>
                <div class="font-bold text-white text-sm">{{ stock.quote.currentPrice }} ج.م</div>
                <span [class]="stock.quote.changePercent >= 0 ? 'text-emeraldAccent' : 'text-roseAccent'" class="text-xs font-semibold">
                  {{ stock.quote.changePercent >= 0 ? '+' : '' }}{{ stock.quote.changePercent }}%
                </span>
              </td>

              <!-- Fair Value -->
              <td>
                <div class="font-bold text-emeraldAccent text-sm">{{ stock.fairValue }} ج.م</div>
                <span class="text-[10px] text-gray-400 font-medium">P/E: {{ stock.quote.peRatio || 'N/A' }}</span>
              </td>

              <!-- Upside Gap % -->
              <td>
                <span [class]="stock.fairValueUpsidePercent >= 15 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-darkCard text-gray-300 border-darkBorder'"
                      class="px-2.5 py-1 rounded-lg text-xs font-black border">
                  {{ stock.fairValueUpsidePercent >= 0 ? '+' : '' }}{{ stock.fairValueUpsidePercent }}%
                </span>
              </td>

              <!-- Signal Badge -->
              <td>
                <span [class]="getSignalBadgeClass(stock.signalType)" class="px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
                  {{ getSignalLabel(stock.signalType) }}
                </span>
              </td>

              <!-- RSI -->
              <td>
                <span [class]="stock.indicators.rsi < 35 ? 'text-emeraldAccent font-bold' : stock.indicators.rsi > 70 ? 'text-roseAccent font-bold' : 'text-gray-300'" class="text-xs">
                  {{ stock.indicators.rsi }}
                </span>
              </td>

              <!-- Sharia Status -->
              <td>
                <span class="text-xs text-emeraldAccent bg-emeraldAccent/10 px-2.5 py-0.5 rounded-full border border-emeraldAccent/20 font-bold">
                  🟢 متوافق
                </span>
              </td>

              <!-- Action button -->
              <td>
                <button (click)="openDetailModal(stock); $event.stopPropagation()"
                        class="bg-darkCard hover:bg-emeraldAccent hover:text-black text-gray-300 p-2 rounded-lg transition-colors">
                  <i class="pi pi-sliders-h text-xs"></i>
                </button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="8" class="text-center py-8 text-gray-400 text-sm">
                لم يتم العثور على أسهم تطابق نتائج البحث.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Detail Modal Dialog -->
      <app-stock-modal [(visible)]="modalVisible" [stock]="selectedStock"></app-stock-modal>
    </div>
  `
})
export class StockScreenerComponent {
  public apiService = inject(StockApiService);

  public searchQuery = '';
  public activeFilter = signal<'ALL' | 'BUY' | 'UNDERVALUED'>('ALL');
  public modalVisible = false;
  public selectedStock: StockAnalysisResult | null = null;

  public buyCount = computed(() =>
    this.apiService.stocks().filter(s => s.signalType === 'BUY' || s.signalType === 'STRONG_BUY').length
  );

  public filteredStocks = computed(() => {
    let list = this.apiService.stocks();
    const query = this.searchQuery.trim().toLowerCase();
    const filter = this.activeFilter();

    if (query) {
      list = list.filter(s =>
        s.quote.symbol.toLowerCase().includes(query) ||
        s.quote.nameAr.toLowerCase().includes(query) ||
        s.quote.nameEn.toLowerCase().includes(query)
      );
    }

    if (filter === 'BUY') {
      list = list.filter(s => s.signalType === 'BUY' || s.signalType === 'STRONG_BUY');
    } else if (filter === 'UNDERVALUED') {
      list = list.filter(s => s.fairValueUpsidePercent >= 15);
    }

    return list;
  });

  openDetailModal(stock: StockAnalysisResult) {
    this.selectedStock = stock;
    this.modalVisible = true;
  }

  getSignalLabel(signal: SignalType): string {
    switch (signal) {
      case 'STRONG_BUY': return '🚀 شراء قوي';
      case 'BUY': return '🟢 شراء';
      case 'NEUTRAL': return '🟡 محايد';
      case 'SELL': return '🔴 بيع';
      case 'STRONG_SELL': return '🚨 بيع قوي';
    }
  }

  getSignalBadgeClass(signal: SignalType): string {
    switch (signal) {
      case 'STRONG_BUY': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'BUY': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
      case 'NEUTRAL': return 'bg-amber-500/15 text-amber-300 border border-amber-500/20';
      case 'SELL': return 'bg-rose-500/15 text-rose-300 border border-rose-500/20';
      case 'STRONG_SELL': return 'bg-rose-500/25 text-rose-200 border border-rose-500/40';
    }
  }
}
