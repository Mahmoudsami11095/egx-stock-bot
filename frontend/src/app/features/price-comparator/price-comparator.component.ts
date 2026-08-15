import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { StockApiService } from '../../core/services/stock-api.service';
import { PriceComparisonResult } from '../../core/models/stock.model';

@Component({
  selector: 'app-price-comparator',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, DialogModule],
  template: `
    <div class="space-y-6 pb-12">
      <!-- Page Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            🏷️ مقارنة الأسعار اللحظية للأسهم عبر مصادر البيانات (Live Price Comparator)
          </h2>
          <p class="text-xs sm:text-sm text-gray-400">
            متابعة ومقارنة أسعار التنفيذ اللحظية، نسب التغير اليومية، وأحجام التداول بين (TradingView ،مباشر Mubasher ،Investing.com ،Yahoo Finance) لكشف فروق الأسعار وتأخر التحديثات
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Refresh Button -->
          <button (click)="loadData(true)"
                  [disabled]="apiService.priceComparisonLoading()"
                  title="إعادة فحص وتحديث أسعار التداول من جميع المصادر لحظياً"
                  class="bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer">
            <i [class]="apiService.priceComparisonLoading() ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"></i>
            <span>{{ apiService.priceComparisonLoading() ? 'جاري فحص الأسعار...' : '⚡ تحديث شامل للأسعار' }}</span>
          </button>

          <!-- Export CSV -->
          <button (click)="exportCSV()"
                  [disabled]="filteredStocks().length === 0"
                  class="bg-darkCard hover:bg-darkBorder text-gray-200 border border-darkBorder font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer">
            <i class="pi pi-download text-emeraldAccent"></i>
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <!-- Total Active Stocks -->
        <div class="glass-card p-4 rounded-2xl border border-darkBorder/60 bg-darkCard/50">
          <div class="flex items-center justify-between text-xs text-gray-400 font-bold mb-1">
            <span>إجمالي الأسهم المتداولة</span>
            <i class="pi pi-chart-bar text-emeraldAccent"></i>
          </div>
          <div class="text-2xl font-black text-white">{{ stats().total }}</div>
          <div class="text-[11px] text-gray-400 mt-1">أسعار لحظية متزامنة</div>
        </div>

        <!-- Synchronized Feed Rate -->
        <div class="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
          <div class="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
            <span>نسبة تطابق الأسعار (≤ 0.5%)</span>
            <i class="pi pi-check-circle text-emeraldAccent"></i>
          </div>
          <div class="text-2xl font-black text-emeraldAccent">{{ stats().syncedPercent }}%</div>
          <div class="text-[11px] text-emerald-400/80 mt-1">{{ stats().syncedCount }} سهم متطابق تماماً</div>
        </div>

        <!-- Divergence Alerts -->
        <div class="glass-card p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <div class="flex items-center justify-between text-xs text-amber-300 font-bold mb-1">
            <span>فارق أسعار ملحوظ (> 1.5%)</span>
            <i class="pi pi-exclamation-triangle text-amber-400"></i>
          </div>
          <div class="text-2xl font-black text-amber-400">{{ stats().divergentCount }}</div>
          <div class="text-[11px] text-amber-300/80 mt-1">اختلاف تنفيذ أو تأخر تغذية</div>
        </div>

        <!-- Top Market Volume -->
        <div class="glass-card p-4 rounded-2xl border border-darkBorder/60 bg-darkCard/50">
          <div class="flex items-center justify-between text-xs text-gray-400 font-bold mb-1">
            <span>أعلى سهم سيولة اليوم</span>
            <i class="pi pi-bolt text-cyan-400"></i>
          </div>
          <div class="text-xl font-black text-cyan-400 truncate">{{ stats().topTradedSymbol }}</div>
          <div class="text-[11px] text-gray-400 mt-1">{{ stats().topTradedVol }} سهم</div>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="glass-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[240px]">
          <i class="pi pi-search absolute right-3 top-3.5 text-gray-400 text-sm"></i>
          <input type="text"
                 [ngModel]="searchQuery()"
                 (ngModelChange)="searchQuery.set($event)"
                 placeholder="بحث برمز السهم أو الاسم (مثال: COMI, ISPH, التجاري الدولي)..."
                 class="w-full bg-darkBg/90 border border-darkBorder rounded-xl pr-9 pl-4 py-2.5 text-sm text-white focus:outline-none focus:border-emeraldAccent transition-colors">
        </div>

        <!-- Sector Filter Dropdown -->
        <div class="min-w-[180px]">
          <select [ngModel]="selectedSector()"
                  (ngModelChange)="selectedSector.set($event)"
                  class="w-full bg-darkBg/90 border border-darkBorder rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emeraldAccent transition-colors cursor-pointer">
            <option value="ALL">جميع القطاعات ({{ availableSectors().length }})</option>
            <option *ngFor="let s of availableSectors()" [value]="s">{{ s }}</option>
          </select>
        </div>

        <!-- Quick Filter Chips -->
        <div class="flex flex-wrap items-center gap-2">
          <button (click)="activeFilter.set('ALL')"
                  [class]="activeFilter() === 'ALL' ? 'bg-emeraldAccent text-black font-bold' : 'bg-darkCard text-gray-300 hover:bg-darkBorder'"
                  class="px-3.5 py-2 rounded-xl text-xs transition-all border border-darkBorder cursor-pointer">
            الكل ({{ apiService.priceComparisons().length }})
          </button>

          <button (click)="activeFilter.set('DIVERGENT')"
                  [class]="activeFilter() === 'DIVERGENT' ? 'bg-amber-600 text-white font-bold' : 'bg-darkCard text-gray-300 hover:bg-darkBorder'"
                  class="px-3.5 py-2 rounded-xl text-xs transition-all border border-darkBorder flex items-center gap-1 cursor-pointer">
            <span>⚡ تباين أسعار (>1.5%)</span>
          </button>

          <button (click)="activeFilter.set('SYNCED')"
                  [class]="activeFilter() === 'SYNCED' ? 'bg-emerald-600 text-white font-bold' : 'bg-darkCard text-gray-300 hover:bg-darkBorder'"
                  class="px-3.5 py-2 rounded-xl text-xs transition-all border border-darkBorder flex items-center gap-1 cursor-pointer">
            <span>🟢 أسعار متطابقة</span>
          </button>

          <button (click)="activeFilter.set('HALAL_ONLY')"
                  [class]="activeFilter() === 'HALAL_ONLY' ? 'bg-indigo-600 text-white font-bold' : 'bg-darkCard text-gray-300 hover:bg-darkBorder'"
                  class="px-3.5 py-2 rounded-xl text-xs transition-all border border-darkBorder flex items-center gap-1 cursor-pointer">
            <span>🕌 متوافق شرعياً فقط</span>
          </button>
        </div>
      </div>

      <!-- Main Price Comparison Data Table -->
      <div class="glass-card rounded-2xl border border-darkBorder overflow-hidden">
        <p-table [value]="filteredStocks()"
                 [paginator]="true"
                 [rows]="15"
                 [rowsPerPageOptions]="[15, 30, 50, 100]"
                 [showCurrentPageReport]="true"
                 currentPageReportTemplate="عرض {first} إلى {last} من أصل {totalRecords} سهم"
                 styleClass="p-datatable-sm custom-dark-table"
                 [tableStyle]="{'min-width': '65rem'}">
          <ng-template pTemplate="header">
            <tr class="bg-darkBg/90 text-gray-400 text-xs font-bold border-b border-darkBorder">
              <th pSortableColumn="symbol" class="py-3.5 px-3">
                السهم / القطاع <p-sortIcon field="symbol"></p-sortIcon>
              </th>
              <th class="py-3.5 px-3 text-center bg-darkCard/40">
                🌐 TradingView
              </th>
              <th class="py-3.5 px-3 text-center bg-darkCard/40">
                📊 مباشر Mubasher
              </th>
              <th class="py-3.5 px-3 text-center bg-darkCard/40">
                📈 Investing.com
              </th>
              <th class="py-3.5 px-3 text-center bg-darkCard/40">
                💹 Yahoo Finance
              </th>
              <th pSortableColumn="averagePrice" class="py-3.5 px-3 text-center bg-emerald-500/10 text-emerald-300">
                متوسط السعر المعروض <p-sortIcon field="averagePrice"></p-sortIcon>
              </th>
              <th pSortableColumn="priceSpreadPercent" class="py-3.5 px-3 text-center">
                فارق السعر (Spread) <p-sortIcon field="priceSpreadPercent"></p-sortIcon>
              </th>
              <th pSortableColumn="maxVolume" class="py-3.5 px-3 text-center">
                حجم التداول <p-sortIcon field="maxVolume"></p-sortIcon>
              </th>
              <th class="py-3.5 px-3 text-center">
                تفاصيل
              </th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-stock>
            <tr class="border-b border-darkBorder/40 hover:bg-darkCard/40 transition-colors text-sm">
              <!-- Stock Name & Sector -->
              <td class="py-3 px-3">
                <div class="flex items-center gap-2">
                  <div class="font-black text-white bg-darkCard px-2.5 py-1 rounded-lg border border-darkBorder text-xs">
                    {{ stock.symbol }}
                  </div>
                  <div>
                    <div class="font-bold text-gray-200 text-xs flex items-center gap-1.5">
                      <span>{{ stock.nameAr }}</span>
                      <span *ngIf="stock.isHalal" class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">🕌 حلال</span>
                    </div>
                    <div class="text-[11px] text-gray-400">{{ stock.sector }}</div>
                  </div>
                </div>
              </td>

              <!-- TradingView -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['tradingview']; else noTv">
                  <div class="font-black text-white text-xs">{{ stock.sources['tradingview'].price }} ج.م</div>
                  <div [class]="stock.sources['tradingview'].changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="text-[11px] font-extrabold">
                    {{ stock.sources['tradingview'].changePercent >= 0 ? '+' : '' }}{{ stock.sources['tradingview'].changePercent }}%
                  </div>
                </ng-container>
                <ng-template #noTv><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- Mubasher -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['mubasher']; else noMub">
                  <div class="font-black text-white text-xs">{{ stock.sources['mubasher'].price }} ج.م</div>
                  <div [class]="stock.sources['mubasher'].changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="text-[11px] font-extrabold">
                    {{ stock.sources['mubasher'].changePercent >= 0 ? '+' : '' }}{{ stock.sources['mubasher'].changePercent }}%
                  </div>
                </ng-container>
                <ng-template #noMub><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- Investing -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['investing']; else noInv">
                  <div class="font-black text-white text-xs">{{ stock.sources['investing'].price }} ج.م</div>
                  <div [class]="stock.sources['investing'].changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="text-[11px] font-extrabold">
                    {{ stock.sources['investing'].changePercent >= 0 ? '+' : '' }}{{ stock.sources['investing'].changePercent }}%
                  </div>
                </ng-container>
                <ng-template #noInv><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- Yahoo -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['yahoo']; else noYah">
                  <div class="font-black text-white text-xs">{{ stock.sources['yahoo'].price }} ج.م</div>
                  <div [class]="stock.sources['yahoo'].changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="text-[11px] font-extrabold">
                    {{ stock.sources['yahoo'].changePercent >= 0 ? '+' : '' }}{{ stock.sources['yahoo'].changePercent }}%
                  </div>
                </ng-container>
                <ng-template #noYah><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- Average Price -->
              <td class="py-3 px-3 text-center bg-emerald-500/5 font-black text-emerald-400">
                <div class="text-sm">{{ stock.averagePrice }} <span class="text-[10px] font-normal">ج.م</span></div>
              </td>

              <!-- Price Spread -->
              <td class="py-3 px-3 text-center">
                <span [class]="getSpreadBadgeClass(stock.priceSpreadPercent)" class="px-2 py-0.5 rounded-lg text-xs font-black inline-flex items-center gap-1">
                  <span>{{ stock.priceSpreadPercent }}%</span>
                  <i *ngIf="stock.priceSpreadPercent > 1.5" class="pi pi-exclamation-triangle text-[10px]"></i>
                </span>
              </td>

              <!-- Volume -->
              <td class="py-3 px-3 text-center font-bold text-gray-300 text-xs">
                <div>{{ stock.maxVolume | number }}</div>
                <div class="text-[10px] text-gray-500 font-normal">عبر {{ stock.highestVolumeSource }}</div>
              </td>

              <!-- Actions Detail Button -->
              <td class="py-3 px-3 text-center">
                <button (click)="openDetail(stock)"
                        title="عرض نطاق الأسعار وأحجام التداول اللحظية بالتفصيل"
                        class="p-1.5 text-gray-300 hover:text-emeraldAccent hover:bg-emeraldAccent/10 rounded-lg transition-colors cursor-pointer">
                  <i class="pi pi-eye text-sm"></i>
                </button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="9" class="text-center py-12 text-gray-400">
                <div class="space-y-2">
                  <i class="pi pi-search text-3xl text-gray-500"></i>
                  <p class="font-bold">لا توجد بيانات أسعار مطابقة لخيارات البحث أو الفلتر الحالية</p>
                  <button (click)="loadData(true)" class="text-xs text-emeraldAccent hover:underline">إعادة تحميل الأسعار</button>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- In-Depth Multi-Source Price Dialog -->
      <p-dialog [header]="selectedStock() ? '🔍 تفاصيل ومقارنة الأسعار: ' + selectedStock()?.nameAr + ' (' + selectedStock()?.symbol + ')' : ''"
                [(visible)]="detailModalVisible"
                [modal]="true"
                [style]="{width: '92vw', maxWidth: '800px'}"
                [dismissableMask]="true">
        <div *ngIf="selectedStock()" class="space-y-5 text-gray-200 py-2">
          <!-- Stock Overview Banner -->
          <div class="flex flex-wrap items-center justify-between gap-3 bg-darkCard/90 p-4 rounded-2xl border border-darkBorder">
            <div>
              <h3 class="text-lg font-black text-white">{{ selectedStock()?.nameAr }} ({{ selectedStock()?.symbol }})</h3>
              <p class="text-xs text-gray-400">{{ selectedStock()?.nameEn }} — قطاع {{ selectedStock()?.sector }}</p>
            </div>
            <div class="text-right">
              <span class="text-[11px] text-gray-400 block font-bold">متوسط السعر المعروض</span>
              <strong class="text-xl text-emeraldAccent font-black">{{ selectedStock()?.averagePrice }} ج.م</strong>
            </div>
          </div>

          <!-- Price Stats Card -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-darkBg/80 p-4 rounded-2xl border border-darkBorder">
            <div>
              <span class="text-[11px] text-gray-400 block">السعر الوسيط (Median)</span>
              <strong class="text-base text-white font-black">{{ selectedStock()?.medianPrice }} ج.م</strong>
            </div>
            <div>
              <span class="text-[11px] text-gray-400 block">أدنى / أعلى سعر</span>
              <strong class="text-xs text-gray-300 font-bold">{{ selectedStock()?.minPrice }} - {{ selectedStock()?.maxPrice }} ج.م</strong>
            </div>
            <div>
              <span class="text-[11px] text-gray-400 block">نسبة الفارق (Spread)</span>
              <span [class]="getSpreadBadgeClass(selectedStock()?.priceSpreadPercent || 0)" class="text-xs font-black px-2 py-0.5 rounded inline-block mt-0.5">
                {{ selectedStock()?.priceSpreadPercent }}%
              </span>
            </div>
            <div>
              <span class="text-[11px] text-gray-400 block">أعلى حجم تداول</span>
              <strong class="text-xs text-cyan-400 font-bold">{{ selectedStock()?.maxVolume | number }}</strong>
            </div>
          </div>

          <!-- Source Comparison Grid -->
          <div class="space-y-3">
            <h4 class="text-sm font-extrabold text-white flex items-center gap-2">
              <i class="pi pi-server text-emeraldAccent"></i>
              بيانات الأسعار اللحظية لكل مزود منفصل:
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div *ngFor="let srcKey of getSourceKeys(selectedStock()!)"
                   class="bg-darkCard p-4 rounded-xl border border-darkBorder/80 space-y-2">
                <div class="flex items-center justify-between border-b border-darkBorder pb-2">
                  <span class="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>{{ getSourceIcon(srcKey) }}</span>
                    <span>{{ getSourceName(srcKey) }}</span>
                  </span>
                  <span [class]="selectedStock()!.sources[srcKey]?.changePercent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'" class="text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {{ selectedStock()!.sources[srcKey]?.changePercent >= 0 ? '+' : '' }}{{ selectedStock()!.sources[srcKey]?.changePercent }}%
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span class="text-gray-400 text-[11px] block">السعر اللحظي:</span>
                    <strong class="text-white font-black text-sm">{{ selectedStock()!.sources[srcKey]?.price }} ج.م</strong>
                  </div>
                  <div>
                    <span class="text-gray-400 text-[11px] block">حجم التداول:</span>
                    <span class="text-gray-200 font-bold">{{ selectedStock()!.sources[srcKey]?.volume | number }}</span>
                  </div>
                  <div>
                    <span class="text-gray-400 text-[11px] block">أعلى سعر اليوم:</span>
                    <span class="text-emerald-400 font-bold">{{ selectedStock()!.sources[srcKey]?.dayHigh }} ج.م</span>
                  </div>
                  <div>
                    <span class="text-gray-400 text-[11px] block">أدنى سعر اليوم:</span>
                    <span class="text-rose-400 font-bold">{{ selectedStock()!.sources[srcKey]?.dayLow }} ج.م</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </p-dialog>
    </div>
  `
})
export class PriceComparatorComponent implements OnInit {
  public apiService = inject(StockApiService);

  public searchQuery = signal<string>('');
  public activeFilter = signal<'ALL' | 'DIVERGENT' | 'SYNCED' | 'HALAL_ONLY'>('ALL');
  public selectedSector = signal<string>('ALL');

  public detailModalVisible = false;
  public selectedStock = signal<PriceComparisonResult | null>(null);

  ngOnInit(): void {
    if (this.apiService.priceComparisons().length === 0) {
      this.loadData();
    }
  }

  public loadData(force: boolean = false): void {
    this.apiService.loadPriceComparisons(force);
  }

  public availableSectors = computed(() => {
    const list = this.apiService.priceComparisons();
    const set = new Set<string>();
    for (const item of list) {
      if (item.sector) set.add(item.sector);
    }
    return Array.from(set).sort();
  });

  public filteredStocks = computed(() => {
    let list = this.apiService.priceComparisons();
    const q = this.searchQuery().toLowerCase().trim();
    const sector = this.selectedSector();
    const filter = this.activeFilter();

    if (q) {
      list = list.filter(s =>
        s.symbol.toLowerCase().includes(q) ||
        (s.nameAr && s.nameAr.toLowerCase().includes(q)) ||
        (s.nameEn && s.nameEn.toLowerCase().includes(q)) ||
        (s.sector && s.sector.toLowerCase().includes(q))
      );
    }

    if (sector !== 'ALL') {
      list = list.filter(s => s.sector === sector);
    }

    if (filter === 'DIVERGENT') {
      list = list.filter(s => s.priceSpreadPercent > 1.5);
    } else if (filter === 'SYNCED') {
      list = list.filter(s => s.priceSpreadPercent <= 0.5);
    } else if (filter === 'HALAL_ONLY') {
      list = list.filter(s => s.isHalal);
    }

    return list;
  });

  public stats = computed(() => {
    const list = this.apiService.priceComparisons();
    if (list.length === 0) {
      return { total: 0, syncedCount: 0, syncedPercent: 0, divergentCount: 0, topTradedSymbol: '—', topTradedVol: '0' };
    }
    const syncedCount = list.filter(s => s.priceSpreadPercent <= 0.5).length;
    const syncedPercent = Number(((syncedCount / list.length) * 100).toFixed(1));
    const divergentCount = list.filter(s => s.priceSpreadPercent > 1.5).length;

    const sortedByVol = [...list].sort((a, b) => b.maxVolume - a.maxVolume);
    const topStock = sortedByVol[0];

    return {
      total: list.length,
      syncedCount,
      syncedPercent,
      divergentCount,
      topTradedSymbol: topStock ? `${topStock.nameAr} (${topStock.symbol})` : '—',
      topTradedVol: topStock ? (topStock.maxVolume || 0).toLocaleString() : '0'
    };
  });

  public openDetail(stock: PriceComparisonResult): void {
    this.selectedStock.set(stock);
    this.detailModalVisible = true;
  }

  public getSourceKeys(stock: PriceComparisonResult): string[] {
    return Object.keys(stock.sources || {});
  }

  public getSourceName(key: string): string {
    const map: Record<string, string> = {
      tradingview: 'TradingView Scanner',
      mubasher: 'مباشر مصر Mubasher',
      investing: 'Investing.com Live',
      yahoo: 'Yahoo Finance'
    };
    return map[key] || key;
  }

  public getSourceIcon(key: string): string {
    const map: Record<string, string> = {
      tradingview: '🌐',
      mubasher: '📊',
      investing: '📈',
      yahoo: '💹'
    };
    return map[key] || '🔹';
  }

  public getSpreadBadgeClass(spread: number): string {
    if (spread <= 0.5) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (spread <= 1.5) return 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20';
    return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
  }

  public exportCSV(): void {
    const list = this.filteredStocks();
    if (list.length === 0) return;

    const headers = ['Symbol', 'Name (AR)', 'Name (EN)', 'Sector', 'TV Price', 'Mubasher Price', 'Investing Price', 'Yahoo Price', 'Average Price', 'Spread %', 'Max Volume'];
    const rows = list.map(s => [
      s.symbol,
      `"${s.nameAr}"`,
      `"${s.nameEn}"`,
      `"${s.sector}"`,
      s.sources['tradingview']?.price || '',
      s.sources['mubasher']?.price || '',
      s.sources['investing']?.price || '',
      s.sources['yahoo']?.price || '',
      s.averagePrice,
      s.priceSpreadPercent,
      s.maxVolume
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EGX_Live_Price_Comparison_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
