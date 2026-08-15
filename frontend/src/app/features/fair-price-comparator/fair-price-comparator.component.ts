import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { StockApiService } from '../../core/services/stock-api.service';
import { FairValueComparisonResult, SourceFairValueData } from '../../core/models/stock.model';

@Component({
  selector: 'app-fair-price-comparator',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule, DialogModule],
  template: `
    <div class="space-y-6 pb-12">
      <!-- Page Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            ⚖️ مقارنة القيم العادلة للأسهم عبر مصادر البيانات المتعددة
          </h2>
          <p class="text-xs sm:text-sm text-gray-400">
            حساب ومقارنة القيم العادلة اللحظية لكل سهم بشكل متزامن من (TradingView ،مباشر Mubasher ،Investing.com ،Yahoo Finance) لكشف فرص المراجحة والتقييم الحقيقي
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Refresh Button -->
          <button (click)="loadData(true)"
                  [disabled]="apiService.comparisonLoading()"
                  title="إعادة حساب ومقارنة جميع المصادر لحظياً"
                  class="bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer">
            <i [class]="apiService.comparisonLoading() ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"></i>
            <span>{{ apiService.comparisonLoading() ? 'جاري الفحص والمقارنة...' : '⚡ تحديث شامل للمصادر' }}</span>
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
        <!-- Total Compared -->
        <div class="glass-card p-4 rounded-2xl border border-darkBorder/60 bg-darkCard/50">
          <div class="flex items-center justify-between text-xs text-gray-400 font-bold mb-1">
            <span>إجمالي الأسهم المقارنة</span>
            <i class="pi pi-list text-emeraldAccent"></i>
          </div>
          <div class="text-2xl font-black text-white">{{ stats().total }}</div>
          <div class="text-[11px] text-gray-400 mt-1">مفحوصة عبر 4 محركات بيانات</div>
        </div>

        <!-- Strong Undervalued Consensus -->
        <div class="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
          <div class="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
            <span>إجماع تقييم: فرصة شراء قوية</span>
            <i class="pi pi-arrow-up-right text-emeraldAccent"></i>
          </div>
          <div class="text-2xl font-black text-emeraldAccent">{{ stats().undervalued }}</div>
          <div class="text-[11px] text-emerald-400/80 mt-1">نمو متوسط أعلى من +15%</div>
        </div>

        <!-- Average Upside Across Market -->
        <div class="glass-card p-4 rounded-2xl border border-darkBorder/60 bg-darkCard/50">
          <div class="flex items-center justify-between text-xs text-gray-400 font-bold mb-1">
            <span>متوسط نسبة النمو للسوق</span>
            <i class="pi pi-chart-line text-cyan-400"></i>
          </div>
          <div class="text-2xl font-black" [ngClass]="stats().avgUpside >= 0 ? 'text-cyan-400' : 'text-rose-400'">
            {{ stats().avgUpside >= 0 ? '+' : '' }}{{ stats().avgUpside }}%
          </div>
          <div class="text-[11px] text-gray-400 mt-1">مقارنة بأسعار التداول الحالية</div>
        </div>

        <!-- High Discrepancy Alerts -->
        <div class="glass-card p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <div class="flex items-center justify-between text-xs text-amber-300 font-bold mb-1">
            <span>تباين مرتفع بين المصادر (>15%)</span>
            <i class="pi pi-exclamation-triangle text-amber-400"></i>
          </div>
          <div class="text-2xl font-black text-amber-400">{{ stats().highDiscrepancy }}</div>
          <div class="text-[11px] text-amber-300/80 mt-1">اختلاف تقدير بين المنصات</div>
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
            الكل ({{ apiService.fairValueComparisons().length }})
          </button>

          <button (click)="activeFilter.set('UNDERVALUED')"
                  [class]="activeFilter() === 'UNDERVALUED' ? 'bg-emerald-600 text-white font-bold' : 'bg-darkCard text-gray-300 hover:bg-darkBorder'"
                  class="px-3.5 py-2 rounded-xl text-xs transition-all border border-darkBorder flex items-center gap-1 cursor-pointer">
            <span>🟢 فرص مقومة بأقل من قيمتها</span>
          </button>

          <button (click)="activeFilter.set('HIGH_DISCREPANCY')"
                  [class]="activeFilter() === 'HIGH_DISCREPANCY' ? 'bg-amber-600 text-white font-bold' : 'bg-darkCard text-gray-300 hover:bg-darkBorder'"
                  class="px-3.5 py-2 rounded-xl text-xs transition-all border border-darkBorder flex items-center gap-1 cursor-pointer">
            <span>⚡ تباين ملحوظ (>15%)</span>
          </button>

          <button (click)="activeFilter.set('HALAL_ONLY')"
                  [class]="activeFilter() === 'HALAL_ONLY' ? 'bg-indigo-600 text-white font-bold' : 'bg-darkCard text-gray-300 hover:bg-darkBorder'"
                  class="px-3.5 py-2 rounded-xl text-xs transition-all border border-darkBorder flex items-center gap-1 cursor-pointer">
            <span>🕌 متوافق شرعياً فقط</span>
          </button>
        </div>
      </div>

      <!-- Main Comparison Data Table -->
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
              <th pSortableColumn="currentPrice" class="py-3.5 px-3 text-center">
                السعر الحالي <p-sortIcon field="currentPrice"></p-sortIcon>
              </th>
              <th class="py-3.5 px-3 text-center bg-darkCard/40">
                🏛️ البورصة المصرية EGX
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
              <th pSortableColumn="averageFairValue" class="py-3.5 px-3 text-center bg-emerald-500/10 text-emerald-300">
                متوسط القيمة العادلة <p-sortIcon field="averageFairValue"></p-sortIcon>
              </th>
              <th pSortableColumn="averageUpsidePercent" class="py-3.5 px-3 text-center">
                متوسط النمو المتوقع <p-sortIcon field="averageUpsidePercent"></p-sortIcon>
              </th>
              <th pSortableColumn="spreadPercent" class="py-3.5 px-3 text-center">
                تباين المصادر <p-sortIcon field="spreadPercent"></p-sortIcon>
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
                      <span *ngIf="stock.isHalal" class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20" title="سهم متوافق شرعياً">🕌 حلال</span>
                    </div>
                    <div class="text-[11px] text-gray-400">{{ stock.sector }}</div>
                  </div>
                </div>
              </td>

              <!-- Current Price -->
              <td class="py-3 px-3 text-center font-black text-white">
                <div>{{ stock.currentPrice }} <span class="text-[10px] text-gray-400 font-normal">ج.م</span></div>
              </td>

              <!-- EGX Official -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['egx']; else noEgx">
                  <div class="font-bold text-white text-xs">{{ stock.sources['egx'].fairValue }} ج.م</div>
                  <div [class]="stock.sources['egx'].upsidePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="text-[11px] font-extrabold">
                    {{ stock.sources['egx'].upsidePercent >= 0 ? '+' : '' }}{{ stock.sources['egx'].upsidePercent }}%
                  </div>
                </ng-container>
                <ng-template #noEgx><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- TradingView -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['tradingview']; else noTv">
                  <div class="font-bold text-white text-xs">{{ stock.sources['tradingview'].fairValue }} ج.م</div>
                  <div [class]="stock.sources['tradingview'].upsidePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="text-[11px] font-extrabold">
                    {{ stock.sources['tradingview'].upsidePercent >= 0 ? '+' : '' }}{{ stock.sources['tradingview'].upsidePercent }}%
                  </div>
                </ng-container>
                <ng-template #noTv><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- Mubasher -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['mubasher']; else noMub">
                  <div class="font-bold text-white text-xs">{{ stock.sources['mubasher'].fairValue }} ج.م</div>
                  <div [class]="stock.sources['mubasher'].upsidePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="text-[11px] font-extrabold">
                    {{ stock.sources['mubasher'].upsidePercent >= 0 ? '+' : '' }}{{ stock.sources['mubasher'].upsidePercent }}%
                  </div>
                </ng-container>
                <ng-template #noMub><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- Investing -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['investing']; else noInv">
                  <div class="font-bold text-white text-xs">{{ stock.sources['investing'].fairValue }} ج.م</div>
                  <div [class]="stock.sources['investing'].upsidePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="text-[11px] font-extrabold">
                    {{ stock.sources['investing'].upsidePercent >= 0 ? '+' : '' }}{{ stock.sources['investing'].upsidePercent }}%
                  </div>
                </ng-container>
                <ng-template #noInv><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- Yahoo -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['yahoo']; else noYah">
                  <div class="font-bold text-white text-xs">{{ stock.sources['yahoo'].fairValue }} ج.م</div>
                  <div [class]="stock.sources['yahoo'].upsidePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="text-[11px] font-extrabold">
                    {{ stock.sources['yahoo'].upsidePercent >= 0 ? '+' : '' }}{{ stock.sources['yahoo'].upsidePercent }}%
                  </div>
                </ng-container>
                <ng-template #noYah><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- Average Fair Value -->
              <td class="py-3 px-3 text-center bg-emerald-500/5 font-black text-emerald-400">
                <div class="text-sm">{{ stock.averageFairValue }} <span class="text-[10px] font-normal">ج.م</span></div>
              </td>

              <!-- Average Upside -->
              <td class="py-3 px-3 text-center">
                <span [class]="getUpsideBadgeClass(stock.averageUpsidePercent)" class="px-2 py-0.5 rounded-lg text-xs font-black inline-block">
                  {{ stock.averageUpsidePercent >= 0 ? '+' : '' }}{{ stock.averageUpsidePercent }}%
                </span>
              </td>

              <!-- Spread / Discrepancy -->
              <td class="py-3 px-3 text-center">
                <span [class]="getSpreadBadgeClass(stock.spreadPercent)" class="px-2 py-0.5 rounded-lg text-xs font-bold inline-flex items-center gap-1">
                  <span>{{ stock.spreadPercent }}%</span>
                  <i *ngIf="stock.spreadPercent > 15" class="pi pi-exclamation-circle text-[10px]"></i>
                </span>
              </td>

              <!-- Actions Detail Button -->
              <td class="py-3 px-3 text-center">
                <button (click)="openDetail(stock)"
                        title="عرض تفكيك نماذج التقييم ومقارنة المصادر بالتفصيل"
                        class="p-1.5 text-gray-300 hover:text-emeraldAccent hover:bg-emeraldAccent/10 rounded-lg transition-colors cursor-pointer">
                  <i class="pi pi-eye text-sm"></i>
                </button>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="10" class="text-center py-12 text-gray-400">
                <div class="space-y-2">
                  <i class="pi pi-search text-3xl text-gray-500"></i>
                  <p class="font-bold">لا توجد بيانات مطابقة لخيارات البحث أو الفلتر الحالية</p>
                  <button (click)="loadData(true)" class="text-xs text-emeraldAccent hover:underline">إعادة تحميل البيانات</button>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- In-Depth Multi-Source Comparison Dialog -->
      <p-dialog [header]="selectedStock() ? '🔍 تحليل ومقارنة مصادر التقييم: ' + selectedStock()?.nameAr + ' (' + selectedStock()?.symbol + ')' : ''"
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
              <span class="text-[11px] text-gray-400 block font-bold">السعر السوقي اللحظي</span>
              <strong class="text-xl text-white font-black">{{ selectedStock()?.currentPrice }} ج.م</strong>
            </div>
          </div>

          <!-- Consensus Stats Card -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-darkBg/80 p-4 rounded-2xl border border-darkBorder">
            <div>
              <span class="text-[11px] text-gray-400 block">متوسط القيمة العادلة</span>
              <strong class="text-base text-emeraldAccent font-black">{{ selectedStock()?.averageFairValue }} ج.م</strong>
            </div>
            <div>
              <span class="text-[11px] text-gray-400 block">الوسيط المالي (Median)</span>
              <strong class="text-base text-white font-black">{{ selectedStock()?.medianFairValue }} ج.م</strong>
            </div>
            <div>
              <span class="text-[11px] text-gray-400 block">أدنى قيمة / أعلى قيمة</span>
              <strong class="text-xs text-gray-300 font-bold">{{ selectedStock()?.minFairValue }} - {{ selectedStock()?.maxFairValue }} ج.م</strong>
            </div>
            <div>
              <span class="text-[11px] text-gray-400 block">فارق التشتت (Spread)</span>
              <span [class]="getSpreadBadgeClass(selectedStock()?.spreadPercent || 0)" class="text-xs font-black px-2 py-0.5 rounded inline-block mt-0.5">
                {{ selectedStock()?.spreadPercent }}%
              </span>
            </div>
          </div>

          <!-- Source Comparison Grid -->
          <div class="space-y-3">
            <h4 class="text-sm font-extrabold text-white flex items-center gap-2">
              <i class="pi pi-server text-emeraldAccent"></i>
              تفاصيل التقييم لكل مزود بيانات منفصل:
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Source Cards -->
              <div *ngFor="let srcKey of getSourceKeys(selectedStock()!)"
                   class="bg-darkCard p-4 rounded-xl border border-darkBorder/80 space-y-2">
                <div class="flex items-center justify-between border-b border-darkBorder pb-2">
                  <span class="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>{{ getSourceIcon(srcKey) }}</span>
                    <span>{{ getSourceName(srcKey) }}</span>
                  </span>
                  <span [class]="getConfidenceClass(selectedStock()!.sources[srcKey]?.confidence)" class="text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ثقة {{ selectedStock()!.sources[srcKey]?.confidence || 'MEDIUM' }}
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span class="text-gray-400 text-[11px] block">القيمة العادلة:</span>
                    <strong class="text-emeraldAccent font-black text-sm">{{ selectedStock()!.sources[srcKey]?.fairValue }} ج.م</strong>
                  </div>
                  <div>
                    <span class="text-gray-400 text-[11px] block">فارق النمو المتوقع:</span>
                    <strong [class]="selectedStock()!.sources[srcKey]?.upsidePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="font-black text-sm">
                      {{ selectedStock()!.sources[srcKey]?.upsidePercent >= 0 ? '+' : '' }}{{ selectedStock()!.sources[srcKey]?.upsidePercent }}%
                    </strong>
                  </div>
                  <div>
                    <span class="text-gray-400 text-[11px] block">السعر المستلم:</span>
                    <span class="text-white font-bold">{{ selectedStock()!.sources[srcKey]?.currentPrice }} ج.م</span>
                  </div>
                  <div>
                    <span class="text-gray-400 text-[11px] block">تغير اليوم:</span>
                    <span [class]="selectedStock()!.sources[srcKey]?.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'" class="font-bold">
                      {{ selectedStock()!.sources[srcKey]?.changePercent >= 0 ? '+' : '' }}{{ selectedStock()!.sources[srcKey]?.changePercent }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Valuation Rule Explanation Note -->
          <div class="bg-darkBg/60 p-3 rounded-xl border border-darkBorder/60 text-[11px] text-gray-400 space-y-1">
            <div class="font-bold text-gray-300 flex items-center gap-1.5">
              <i class="pi pi-info-circle text-emeraldAccent"></i>
              <span>كيف يتم حساب القيم العادلة ومقارنتها؟</span>
            </div>
            <p>
              يتم استدعاء بيانات كل مصدر وتمريرها على محرك التقييم المالي الموحد <code class="text-emeraldAccent">fairValueEngine</code> لتطبيق نماذج مضاعف الربحية (P/E)، القيمة الدفترية (P/B)، ونموذج جوردون لخصم التوزيعات (DDM) مع خصم معدل الفائدة للبنك المركزي (CBE).
            </p>
          </div>
        </div>
      </p-dialog>
    </div>
  `
})
export class FairPriceComparatorComponent implements OnInit {
  public apiService = inject(StockApiService);

  public searchQuery = signal<string>('');
  public activeFilter = signal<'ALL' | 'UNDERVALUED' | 'HIGH_DISCREPANCY' | 'HALAL_ONLY'>('ALL');
  public selectedSector = signal<string>('ALL');

  public detailModalVisible = false;
  public selectedStock = signal<FairValueComparisonResult | null>(null);

  ngOnInit(): void {
    if (this.apiService.fairValueComparisons().length === 0) {
      this.loadData();
    }
  }

  public loadData(force: boolean = false): void {
    this.apiService.loadFairValueComparisons(force);
  }

  public availableSectors = computed(() => {
    const list = this.apiService.fairValueComparisons();
    const set = new Set<string>();
    for (const item of list) {
      if (item.sector) set.add(item.sector);
    }
    return Array.from(set).sort();
  });

  public filteredStocks = computed(() => {
    let list = this.apiService.fairValueComparisons();
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

    if (filter === 'UNDERVALUED') {
      list = list.filter(s => s.averageUpsidePercent >= 15);
    } else if (filter === 'HIGH_DISCREPANCY') {
      list = list.filter(s => s.spreadPercent >= 15);
    } else if (filter === 'HALAL_ONLY') {
      list = list.filter(s => s.isHalal);
    }

    return list;
  });

  public stats = computed(() => {
    const list = this.apiService.fairValueComparisons();
    if (list.length === 0) {
      return { total: 0, undervalued: 0, avgUpside: 0, highDiscrepancy: 0 };
    }
    const undervalued = list.filter(s => s.averageUpsidePercent >= 15).length;
    const highDiscrepancy = list.filter(s => s.spreadPercent >= 15).length;
    const sumUpside = list.reduce((acc, s) => acc + s.averageUpsidePercent, 0);
    const avgUpside = Number((sumUpside / list.length).toFixed(1));

    return {
      total: list.length,
      undervalued,
      avgUpside,
      highDiscrepancy
    };
  });

  public openDetail(stock: FairValueComparisonResult): void {
    this.selectedStock.set(stock);
    this.detailModalVisible = true;
  }

  public getSourceKeys(stock: FairValueComparisonResult): string[] {
    return Object.keys(stock.sources || {});
  }

  public getSourceName(key: string): string {
    const map: Record<string, string> = {
      egx: 'البورصة المصرية EGX Official',
      tradingview: 'TradingView Scanner',
      mubasher: 'مباشر مصر Mubasher',
      investing: 'Investing.com Multi-Factor',
      yahoo: 'Yahoo Finance Model',
      eodhd: 'EODHD Historical Model'
    };
    return map[key] || key;
  }

  public getSourceIcon(key: string): string {
    const map: Record<string, string> = {
      egx: '🏛️',
      tradingview: '🌐',
      mubasher: '📊',
      investing: '📈',
      yahoo: '💹',
      eodhd: '📡'
    };
    return map[key] || '🔹';
  }

  public getConfidenceClass(conf?: string): string {
    if (conf === 'HIGH') return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    if (conf === 'MEDIUM') return 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30';
    return 'bg-gray-500/15 text-gray-300 border border-gray-500/30';
  }

  public getUpsideBadgeClass(upside: number): string {
    if (upside >= 25) return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
    if (upside >= 10) return 'bg-emerald-500/10 text-emerald-400';
    if (upside <= -15) return 'bg-rose-500/20 text-rose-300 border border-rose-500/40';
    if (upside <= -5) return 'bg-rose-500/10 text-rose-400';
    return 'bg-gray-500/10 text-gray-300';
  }

  public getSpreadBadgeClass(spread: number): string {
    if (spread <= 5) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (spread <= 15) return 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20';
    return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
  }

  public exportCSV(): void {
    const list = this.filteredStocks();
    if (list.length === 0) return;

    const headers = ['Symbol', 'Name (AR)', 'Name (EN)', 'Sector', 'Current Price', 'EGX FV', 'TV FV', 'Mubasher FV', 'Investing FV', 'Yahoo FV', 'Average FV', 'Average Upside %', 'Spread %'];
    const rows = list.map(s => [
      s.symbol,
      `"${s.nameAr}"`,
      `"${s.nameEn}"`,
      `"${s.sector}"`,
      s.currentPrice,
      s.sources['tradingview']?.fairValue || '',
      s.sources['mubasher']?.fairValue || '',
      s.sources['investing']?.fairValue || '',
      s.sources['yahoo']?.fairValue || '',
      s.averageFairValue,
      s.averageUpsidePercent,
      s.spreadPercent
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EGX_Fair_Value_Comparison_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
