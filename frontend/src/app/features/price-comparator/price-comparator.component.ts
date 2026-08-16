import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { StockApiService } from '../../core/services/stock-api.service';
import { PriceComparisonResult, ComparatorMetricType, SourcePriceData } from '../../core/models/stock.model';

export interface MetricDefinition {
  id: ComparatorMetricType;
  label: string;
  shortLabel: string;
  category: 'MARKET' | 'FAIR_VALUE' | 'PROFITS' | 'FUNDAMENTALS';
  icon: string;
  unit: string;
  formulaDescription: string;
}

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
            <span>{{ activeMetricInfo().icon }}</span>
            <span>مقارنة البيانات ونماذج التقييم والأرباح متعددة المصادر</span>
          </h2>
          <p class="text-xs sm:text-sm text-gray-400">
            مقارنة لحظية عبر 5 مصادر (🏛️ البورصة المصرية EGX ،🌐 TradingView ،📊 مباشر مصر Mubasher ،📈 Investing.com ،💹 Yahoo Finance) لجميع أسهم السوق ({{ apiService.priceComparisons().length || 297 }} سهم)
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Refresh Button -->
          <button (click)="loadData(true)"
                  [disabled]="apiService.priceComparisonLoading()"
                  title="إعادة فحص وتحديث البيانات ونماذج التقييم لحظياً"
                  class="bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer">
            <i [class]="apiService.priceComparisonLoading() ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"></i>
            <span>{{ apiService.priceComparisonLoading() ? 'جاري الفحص...' : '⚡ تحديث شامل للبيانات' }}</span>
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

      <!-- Feature / Parameter Selector Toolbar -->
      <div class="glass-card p-4 rounded-2xl border border-darkBorder/80 bg-darkCard/40 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <i class="pi pi-sliders-h text-emeraldAccent"></i>
              <span>اختر المؤشر أو نموذج التقييم أو الأرباح المطلوب مقارنتها:</span>
            </span>
          </div>

          <!-- Feature Dropdown with Categorized Groups -->
          <div class="w-full sm:w-auto min-w-[360px]">
            <select [ngModel]="selectedMetric()"
                    (ngModelChange)="selectedMetric.set($event)"
                    class="w-full bg-darkBg border-2 border-emerald-500/40 hover:border-emerald-500 rounded-xl px-3.5 py-2 text-xs font-black text-emerald-300 focus:outline-none focus:border-emeraldAccent transition-colors cursor-pointer">
              <optgroup label="💰 الأرباح وهوامش الربحية (Profits & Margins)">
                <option value="NET_INCOME">💰 صافي الأرباح السنوية (Net Income TTM)</option>
                <option value="NET_PROFIT_MARGIN">📊 هامش صافي الربح (Net Profit Margin %)</option>
                <option value="GROSS_PROFIT">🏢 إجمالي الإيرادات السنوية (Total Revenue)</option>
              </optgroup>
              <optgroup label="⚖️ نماذج حساب القيمة العادلة (Fair Value Models)">
                <option value="FAIR_VALUE">⚖️ متوسط القيمة العادلة المرجح (Consensus Multi-Model)</option>
                <option value="FAIR_VALUE_GRAHAM">📐 نموذج بنيامين جراهام (Graham: √(22.5×EPS×BVPS))</option>
                <option value="FAIR_VALUE_PE">📊 نموذج مضاعف الربحية القطاعي (Sector P/E Model)</option>
                <option value="FAIR_VALUE_LYNCH">🚀 نموذج بيتر لينش للنمو (Peter Lynch Model)</option>
                <option value="FAIR_VALUE_PB">📚 نموذج القيمة الدفترية والعائد (P/B & ROE Model)</option>
                <option value="UPSIDE_PERCENT">🎯 نسبة النمو المتوقع حتى القيمة العادلة (Expected Upside %)</option>
              </optgroup>
              <optgroup label="📈 أسعار وتداولات الجلسة (Market Live Quotes)">
                <option value="PRICE">💵 السعر اللحظي (Last Trade Price)</option>
                <option value="CHANGE_PERCENT">📈 نسبة التغير اليومي (Daily Change %)</option>
                <option value="VOLUME">📊 حجم التداول (Traded Volume)</option>
                <option value="DAY_HIGH">🔝 أعلى سعر بالجلسة (Day High)</option>
                <option value="DAY_LOW">🔻 أدنى سعر بالجلسة (Day Low)</option>
              </optgroup>
              <optgroup label="💰 المؤشرات والربحية (Fundamentals)">
                <option value="PE_RATIO">💰 مضاعف الربحية (P/E Ratio)</option>
                <option value="EPS">🪙 ربحية السهم السنوية (EPS TTM)</option>
              </optgroup>
            </select>
          </div>
        </div>

        <!-- Formula & Description Banner for Active Metric -->
        <div class="bg-darkBg/70 px-3.5 py-2 rounded-xl border border-darkBorder flex items-center gap-2 text-xs text-gray-300">
          <span class="text-emeraldAccent font-bold">المعادلة / التعريف:</span>
          <span>{{ activeMetricInfo().formulaDescription }}</span>
        </div>

        <!-- Quick Switch Pill Buttons -->
        <div class="flex flex-wrap items-center gap-1.5 pt-1">
          <span class="text-[11px] text-gray-400 font-bold ml-1">الخيارات السريعة:</span>
          <button *ngFor="let m of quickPillMetrics"
                  (click)="selectedMetric.set(m.id)"
                  [class]="selectedMetric() === m.id ? 'bg-emerald-500 text-black font-black shadow-md shadow-emerald-500/20' : 'bg-darkBg text-gray-300 hover:bg-darkCard border border-darkBorder/80 font-bold'"
                  class="px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer">
            <span>{{ m.icon }}</span>
            <span>{{ m.shortLabel }}</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards (Dynamically adapt to active metric) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <!-- Total Active Stocks -->
        <div class="glass-card p-4 rounded-2xl border border-darkBorder/60 bg-darkCard/50">
          <div class="flex items-center justify-between text-xs text-gray-400 font-bold mb-1">
            <span>إجمالي الأسهم المغطاة</span>
            <i class="pi pi-database text-emeraldAccent"></i>
          </div>
          <div class="text-2xl font-black text-white">{{ stats().total }}</div>
          <div class="text-[11px] text-gray-400 mt-1">عبر 4 مصادر متزامنة</div>
        </div>

        <!-- Metric Market Average -->
        <div class="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
          <div class="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
            <span>متوسط السوق ({{ activeMetricInfo().shortLabel }})</span>
            <i class="pi pi-chart-line text-emeraldAccent"></i>
          </div>
          <div class="text-2xl font-black text-emeraldAccent">
            {{ stats().marketAvgDisplay }}
          </div>
          <div class="text-[11px] text-emerald-400/80 mt-1">متوسط إجماع كافة الأسهم</div>
        </div>

        <!-- Metric Alignment Rate -->
        <div class="glass-card p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/5">
          <div class="flex items-center justify-between text-xs text-cyan-300 font-bold mb-1">
            <span>نسبة تطابق المصادر</span>
            <i class="pi pi-check-circle text-cyan-400"></i>
          </div>
          <div class="text-2xl font-black text-cyan-400">{{ stats().syncedPercent }}%</div>
          <div class="text-[11px] text-cyan-300/80 mt-1">{{ stats().syncedCount }} سهم متقارب تماماً</div>
        </div>

        <!-- Metric Leader Stock -->
        <div class="glass-card p-4 rounded-2xl border border-darkBorder/60 bg-darkCard/50">
          <div class="flex items-center justify-between text-xs text-gray-400 font-bold mb-1">
            <span>أعلى سهم بالمؤشر</span>
            <i class="pi pi-bolt text-amber-400"></i>
          </div>
          <div class="text-base font-black text-amber-300 truncate" [title]="stats().topStockName">
            {{ stats().topStockName }}
          </div>
          <div class="text-[11px] text-gray-400 mt-1">{{ stats().topStockVal }}</div>
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
                 placeholder="بحث برمز السهم أو الاسم (مثال: COMI, KRDI, التجاري الدولي)..."
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
            <span>⚡ تباين ملحوظ (>1.5%)</span>
          </button>

          <button (click)="activeFilter.set('SYNCED')"
                  [class]="activeFilter() === 'SYNCED' ? 'bg-emerald-600 text-white font-bold' : 'bg-darkCard text-gray-300 hover:bg-darkBorder'"
                  class="px-3.5 py-2 rounded-xl text-xs transition-all border border-darkBorder flex items-center gap-1 cursor-pointer">
            <span>🟢 مصادر متطابقة</span>
          </button>

          <button (click)="activeFilter.set('HALAL_ONLY')"
                  [class]="activeFilter() === 'HALAL_ONLY' ? 'bg-indigo-600 text-white font-bold' : 'bg-darkCard text-gray-300 hover:bg-darkBorder'"
                  class="px-3.5 py-2 rounded-xl text-xs transition-all border border-darkBorder flex items-center gap-1 cursor-pointer">
            <span>🕌 متوافق شرعياً</span>
          </button>
        </div>
      </div>

      <!-- Main Universal Multi-Source Comparison Table -->
      <div class="glass-card rounded-2xl border border-darkBorder overflow-hidden">
        <p-table [value]="filteredStocks()"
                 [paginator]="true"
                 [rows]="15"
                 [rowsPerPageOptions]="[15, 30, 50, 100]"
                 [showCurrentPageReport]="true"
                 currentPageReportTemplate="عرض {first} إلى {last} من أصل {totalRecords} سهم"
                 styleClass="p-datatable-sm custom-dark-table"
                 [tableStyle]="{'min-width': '70rem'}">
          <ng-template pTemplate="header">
            <tr class="bg-darkBg/90 text-gray-400 text-xs font-bold border-b border-darkBorder">
              <th pSortableColumn="symbol" class="py-3.5 px-3">
                السهم / القطاع <p-sortIcon field="symbol"></p-sortIcon>
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
              <th class="py-3.5 px-3 text-center bg-emerald-500/10 text-emerald-300">
                متوسط الإجماع (Consensus)
              </th>
              <th class="py-3.5 px-3 text-center">
                فارق التباين (Spread)
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

              <!-- EGX Official -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['egx']; else noEgx">
                  <div [class]="getMetricColorClass(stock.sources['egx'], selectedMetric())" class="font-black text-xs">
                    {{ formatSourceMetric(stock.sources['egx'], selectedMetric()) }}
                  </div>
                  <div class="text-[10px] text-gray-500" *ngIf="selectedMetric() === 'PRICE'">
                    {{ stock.sources['egx'].changePercent >= 0 ? '+' : '' }}{{ stock.sources['egx'].changePercent }}%
                  </div>
                </ng-container>
                <ng-template #noEgx><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- TradingView -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['tradingview']; else noTv">
                  <div [class]="getMetricColorClass(stock.sources['tradingview'], selectedMetric())" class="font-black text-xs">
                    {{ formatSourceMetric(stock.sources['tradingview'], selectedMetric()) }}
                  </div>
                  <div class="text-[10px] text-gray-500" *ngIf="selectedMetric() === 'PRICE'">
                    {{ stock.sources['tradingview'].changePercent >= 0 ? '+' : '' }}{{ stock.sources['tradingview'].changePercent }}%
                  </div>
                </ng-container>
                <ng-template #noTv><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- Mubasher -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['mubasher']; else noMub">
                  <div [class]="getMetricColorClass(stock.sources['mubasher'], selectedMetric())" class="font-black text-xs">
                    {{ formatSourceMetric(stock.sources['mubasher'], selectedMetric()) }}
                  </div>
                  <div class="text-[9px] text-amber-400/90 font-bold mt-0.5" *ngIf="selectedMetric() === 'NET_INCOME' && stock.sources['mubasher'].netIncomePeriod">
                    {{ stock.sources['mubasher'].netIncomePeriod }}
                  </div>
                  <div class="text-[10px] text-gray-500" *ngIf="selectedMetric() === 'PRICE'">
                    {{ stock.sources['mubasher'].changePercent >= 0 ? '+' : '' }}{{ stock.sources['mubasher'].changePercent }}%
                  </div>
                </ng-container>
                <ng-template #noMub><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- Investing -->
              <td class="py-3 px-3 text-center bg-darkCard/20">
                <ng-container *ngIf="stock.sources['investing']; else noInv">
                  <div [class]="getMetricColorClass(stock.sources['investing'], selectedMetric())" class="font-black text-xs">
                    {{ formatSourceMetric(stock.sources['investing'], selectedMetric()) }}
                  </div>
                  <div class="text-[10px] text-gray-500" *ngIf="selectedMetric() === 'PRICE'">
                    {{ stock.sources['investing'].changePercent >= 0 ? '+' : '' }}{{ stock.sources['investing'].changePercent }}%
                  </div>
                </ng-container>
                <ng-template #noInv><span class="text-xs text-gray-500">—</span></ng-template>
              </td>

              <!-- Consensus Average -->
              <td class="py-3 px-3 text-center bg-emerald-500/5 font-black text-emerald-400">
                <div class="text-xs">{{ formatStockConsensus(stock, selectedMetric()) }}</div>
              </td>

              <!-- Spread / Discrepancy -->
              <td class="py-3 px-3 text-center">
                <span [class]="getSpreadBadgeClass(stock.priceSpreadPercent)" class="px-2 py-0.5 rounded-lg text-xs font-black inline-flex items-center gap-1">
                  <span>{{ stock.priceSpreadPercent }}%</span>
                  <i *ngIf="stock.priceSpreadPercent > 1.5" class="pi pi-exclamation-triangle text-[10px]"></i>
                </span>
              </td>

              <!-- Traded Volume -->
              <td class="py-3 px-3 text-center font-bold text-gray-300 text-xs">
                <div>{{ stock.maxVolume | number }}</div>
                <div class="text-[10px] text-gray-500 font-normal">عبر {{ stock.highestVolumeSource }}</div>
              </td>

              <!-- Actions Detail Button -->
              <td class="py-3 px-3 text-center">
                <button (click)="openDetail(stock)"
                        title="عرض المقارنة الشاملة لجميع النماذج والمؤشرات بالتفصيل"
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

      <!-- In-Depth Multi-Model Valuation Dialog (👁️) -->
      <p-dialog [header]="selectedStock() ? '🔍 بطاقة المقارنة الشاملة لنماذج التقييم والأرباح: ' + selectedStock()?.nameAr + ' (' + selectedStock()?.symbol + ')' : ''"
                [(visible)]="detailModalVisible"
                [modal]="true"
                [style]="{width: '94vw', maxWidth: '920px'}"
                [dismissableMask]="true">
        <div *ngIf="selectedStock()" class="space-y-5 text-gray-200 py-2">
          <!-- Stock Header Banner -->
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

          <!-- All Valuation Models & Market Matrix -->
          <div class="space-y-2">
            <h4 class="text-xs font-extrabold text-gray-300 flex items-center gap-1.5">
              <i class="pi pi-table text-emeraldAccent"></i>
              <span>مصفوفة مقارنة كافة المؤشرات ونماذج القيمة العادلة والأرباح:</span>
            </h4>

            <div class="overflow-x-auto rounded-xl border border-darkBorder">
              <table class="w-full text-xs text-right border-collapse">
                <thead>
                  <tr class="bg-darkBg/90 text-gray-400 font-bold border-b border-darkBorder">
                    <th class="p-2.5">المؤشر / نموذج التقييم</th>
                    <th class="p-2.5 text-center">🏛️ EGX</th>
                    <th class="p-2.5 text-center">🌐 TradingView</th>
                    <th class="p-2.5 text-center">📊 Mubasher</th>
                    <th class="p-2.5 text-center">📈 Investing</th>
                    <th class="p-2.5 text-center">💹 Yahoo</th>
                    <th class="p-2.5 text-center bg-emerald-500/10 text-emerald-300">الإجماع</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-darkBorder/40">
                  <tr *ngFor="let m of metricList" class="hover:bg-darkCard/30">
                    <td class="p-2.5 font-bold text-white flex items-center gap-1.5">
                      <span>{{ m.icon }}</span>
                      <span>{{ m.label }}</span>
                    </td>
                    <td class="p-2.5 text-center font-bold" [class]="getMetricColorClass(selectedStock()!.sources['egx'], m.id)">
                      {{ formatSourceMetric(selectedStock()!.sources['egx'], m.id) }}
                    </td>
                    <td class="p-2.5 text-center font-bold" [class]="getMetricColorClass(selectedStock()!.sources['tradingview'], m.id)">
                      {{ formatSourceMetric(selectedStock()!.sources['tradingview'], m.id) }}
                    </td>
                    <td class="p-2.5 text-center font-bold" [class]="getMetricColorClass(selectedStock()!.sources['mubasher'], m.id)">
                      {{ formatSourceMetric(selectedStock()!.sources['mubasher'], m.id) }}
                    </td>
                    <td class="p-2.5 text-center font-bold" [class]="getMetricColorClass(selectedStock()!.sources['investing'], m.id)">
                      {{ formatSourceMetric(selectedStock()!.sources['investing'], m.id) }}
                    </td>
                    <td class="p-2.5 text-center font-bold" [class]="getMetricColorClass(selectedStock()!.sources['yahoo'], m.id)">
                      {{ formatSourceMetric(selectedStock()!.sources['yahoo'], m.id) }}
                    </td>
                    <td class="p-2.5 text-center font-black bg-emerald-500/5 text-emerald-400">
                      {{ formatStockConsensus(selectedStock()!, m.id) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </p-dialog>
    </div>
  `
})
export class PriceComparatorComponent implements OnInit {
  public apiService = inject(StockApiService);

  public selectedMetric = signal<ComparatorMetricType>('NET_INCOME');
  public searchQuery = signal<string>('');
  public activeFilter = signal<'ALL' | 'DIVERGENT' | 'SYNCED' | 'HALAL_ONLY'>('ALL');
  public selectedSector = signal<string>('ALL');

  public detailModalVisible = false;
  public selectedStock = signal<PriceComparisonResult | null>(null);

  public metricList: MetricDefinition[] = [
    {
      id: 'NET_INCOME',
      label: 'صافي الأرباح السنوية (Net Income TTM)',
      shortLabel: 'صافي الأرباح',
      category: 'PROFITS',
      icon: '💰',
      unit: 'ج.م',
      formulaDescription: 'صافي الربح السنوي المحقق بعد خصم كافة المصروفات والفوائد والضرائب (TTM)'
    },
    {
      id: 'NET_PROFIT_MARGIN',
      label: 'هامش صافي الربح (Net Profit Margin %)',
      shortLabel: 'هامش الربح %',
      category: 'PROFITS',
      icon: '📊',
      unit: '%',
      formulaDescription: '(صافي الأرباح ÷ إجمالي الإيرادات) × 100% — يقيس كفاءة تحويل المبيعات إلى أرباح'
    },
    {
      id: 'GROSS_PROFIT',
      label: 'إجمالي الإيرادات السنوية (Total Revenue)',
      shortLabel: 'إجمالي الإيرادات',
      category: 'PROFITS',
      icon: '🏢',
      unit: 'ج.م',
      formulaDescription: 'إجمالي مبيعات وإيرادات النشاط التشغيلي لآخر 12 شهراً'
    },
    {
      id: 'FAIR_VALUE',
      label: 'متوسط القيمة العادلة المرجح (Consensus)',
      shortLabel: 'القيمة العادلة (إجماع)',
      category: 'FAIR_VALUE',
      icon: '⚖️',
      unit: 'ج.م',
      formulaDescription: 'متوسط كافة نماذج التقييم الأساسية المتاحة (جراهام + مكرر الربحية + بيتر لينش + القيمة الدفترية)'
    },
    {
      id: 'FAIR_VALUE_GRAHAM',
      label: 'القيمة العادلة: نموذج بنيامين جراهام (Graham Intrinsic)',
      shortLabel: 'نموذج جراهام',
      category: 'FAIR_VALUE',
      icon: '📐',
      unit: 'ج.م',
      formulaDescription: '√(22.5 × ربحية السهم EPS × القيمة الدفترية للسهم BVPS) — نموذج تقييم القيمة الحقيقية الصارمة'
    },
    {
      id: 'FAIR_VALUE_PE',
      label: 'القيمة العادلة: مضاعف الربحية القطاعي (Sector P/E)',
      shortLabel: 'مضاعف P/E القطاعي',
      category: 'FAIR_VALUE',
      icon: '📊',
      unit: 'ج.م',
      formulaDescription: 'ربحية السهم EPS × مضاعف الربحية العادل لقطاع الشركة × معامل خصم الفائدة بالمركزي المصري (0.82)'
    },
    {
      id: 'FAIR_VALUE_LYNCH',
      label: 'القيمة العادلة: نموذج بيتر لينش للنمو (Peter Lynch)',
      shortLabel: 'نموذج بيتر لينش',
      category: 'FAIR_VALUE',
      icon: '🚀',
      unit: 'ج.م',
      formulaDescription: 'ربحية السهم EPS × (معدل نمو الأرباح المتوقع + عائد التوزيع النقدي Dividend Yield)'
    },
    {
      id: 'FAIR_VALUE_PB',
      label: 'القيمة العادلة: القيمة الدفترية وROE (P/B & ROE)',
      shortLabel: 'الدفترية وROE',
      category: 'FAIR_VALUE',
      icon: '📚',
      unit: 'ج.م',
      formulaDescription: 'القيمة الدفترية للسهم BVPS × (العائد على حقوق الملكية ROE ÷ معدل العائد المطلوب 20%)'
    },
    {
      id: 'UPSIDE_PERCENT',
      label: 'نسبة النمو المتوقع للقيمة العادلة (Expected Upside %)',
      shortLabel: 'النمو المتوقع %',
      category: 'FAIR_VALUE',
      icon: '🎯',
      unit: '%',
      formulaDescription: '((متوسط القيمة العادلة - سعر التداول الحالي) ÷ سعر التداول الحالي) × 100%'
    },
    {
      id: 'PRICE',
      label: 'السعر اللحظي (Last Trade Price)',
      shortLabel: 'السعر اللحظي',
      category: 'MARKET',
      icon: '💵',
      unit: 'ج.م',
      formulaDescription: 'آخر سعر تنفيذ تم تسجيله في جلسة التداول اللحظية بالجنيه المصري'
    },
    {
      id: 'CHANGE_PERCENT',
      label: 'نسبة التغير اليومي (Daily Change %)',
      shortLabel: 'التغير اليومي %',
      category: 'MARKET',
      icon: '📈',
      unit: '%',
      formulaDescription: 'نسبة تغير سعر الإغلاق الحالي مقارنة بإغلاق الجلسة السابقة'
    },
    {
      id: 'VOLUME',
      label: 'حجم التداول (Traded Volume)',
      shortLabel: 'حجم التداول',
      category: 'MARKET',
      icon: '📊',
      unit: 'سهم',
      formulaDescription: 'إجمالي كمية الأسهم المنفذة والمتداولة خلال الجلسة'
    },
    {
      id: 'DAY_HIGH',
      label: 'أعلى سعر بالجلسة (Day High)',
      shortLabel: 'أعلى سعر',
      category: 'MARKET',
      icon: '🔝',
      unit: 'ج.م',
      formulaDescription: 'أعلى نقطة سعرية وصل إليها السهم خلال جلسة اليوم'
    },
    {
      id: 'DAY_LOW',
      label: 'أدنى سعر بالجلسة (Day Low)',
      shortLabel: 'أدنى سعر',
      category: 'MARKET',
      icon: '🔻',
      unit: 'ج.م',
      formulaDescription: 'أدنى نقطة سعرية وصل إليها السهم خلال جلسة اليوم'
    },
    {
      id: 'PE_RATIO',
      label: 'مضاعف الربحية (P/E Ratio)',
      shortLabel: 'مكرر الربحية',
      category: 'FUNDAMENTALS',
      icon: '💰',
      unit: 'x',
      formulaDescription: 'سعر السهم السوقي ÷ ربحية السهم لآخر 12 شهراً (TTM)'
    },
    {
      id: 'EPS',
      label: 'ربحية السهم (EPS TTM)',
      shortLabel: 'ربحية السهم',
      category: 'FUNDAMENTALS',
      icon: '🪙',
      unit: 'ج.م',
      formulaDescription: 'نصيب السهم الواحد من صافي الأرباح السنوية المحققة'
    }
  ];

  public quickPillMetrics = [
    this.metricList[0], // Net Income
    this.metricList[1], // Net Margin %
    this.metricList[3], // Consensus FV
    this.metricList[4], // Graham FV
    this.metricList[5], // Sector PE FV
    this.metricList[8], // Upside %
    this.metricList[9], // Price
    this.metricList[10] // Change %
  ];

  public activeMetricInfo = computed(() => {
    const activeId = this.selectedMetric();
    return this.metricList.find(m => m.id === activeId) || this.metricList[0];
  });

  ngOnInit(): void {
    this.loadData();
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
    const metric = this.selectedMetric();

    if (list.length === 0) {
      return {
        total: 0,
        syncedCount: 0,
        syncedPercent: 0,
        divergentCount: 0,
        marketAvgDisplay: '—',
        topStockName: '—',
        topStockVal: '—'
      };
    }

    const syncedCount = list.filter(s => s.priceSpreadPercent <= 0.5).length;
    const syncedPercent = Number(((syncedCount / list.length) * 100).toFixed(1));
    const divergentCount = list.filter(s => s.priceSpreadPercent > 1.5).length;

    let sum = 0;
    let count = 0;
    let topStock = list[0];
    let topVal = -Infinity;

    for (const s of list) {
      const val = this.getNumericMetricValue(s, metric);
      if (val !== null && !isNaN(val)) {
        sum += val;
        count++;
        if (val > topVal) {
          topVal = val;
          topStock = s;
        }
      }
    }

    const avg = count > 0 ? sum / count : 0;
    const marketAvgDisplay = this.formatCurrencyOrNumber(avg, metric);
    const topStockValDisplay = this.formatCurrencyOrNumber(topVal, metric);

    return {
      total: list.length,
      syncedCount,
      syncedPercent,
      divergentCount,
      marketAvgDisplay,
      topStockName: topStock ? `${topStock.nameAr} (${topStock.symbol})` : '—',
      topStockVal: topStockValDisplay
    };
  });

  public getNumericMetricValue(stock: PriceComparisonResult, metric: ComparatorMetricType): number | null {
    switch (metric) {
      case 'NET_INCOME': return stock.averageNetIncome ?? null;
      case 'NET_PROFIT_MARGIN': return stock.averageNetProfitMargin ?? null;
      case 'GROSS_PROFIT': return stock.averageGrossProfit ?? null;
      case 'PRICE': return stock.averagePrice;
      case 'FAIR_VALUE': return stock.averageFairValue || stock.averagePrice;
      case 'FAIR_VALUE_GRAHAM': return stock.averageFairValueGraham || null;
      case 'FAIR_VALUE_PE': return stock.averageFairValuePE || null;
      case 'FAIR_VALUE_LYNCH': return stock.averageFairValueLynch || null;
      case 'FAIR_VALUE_PB': return stock.averageFairValuePB || null;
      case 'UPSIDE_PERCENT': return stock.averageUpsidePercent || 0;
      case 'VOLUME': return stock.maxVolume;
      case 'CHANGE_PERCENT': return stock.sources['tradingview']?.changePercent ?? stock.sources['egx']?.changePercent ?? 0;
      case 'DAY_HIGH': return stock.sources['tradingview']?.dayHigh ?? stock.averagePrice;
      case 'DAY_LOW': return stock.sources['tradingview']?.dayLow ?? stock.averagePrice;
      case 'PE_RATIO': return stock.averagePeRatio || 9.0;
      case 'EPS': return stock.averageEps || 0;
      default: return stock.averagePrice;
    }
  }

  public formatCurrencyOrNumber(val: number, metric: ComparatorMetricType): string {
    if (val === null || val === undefined || isNaN(val) || val === -Infinity) return '—';
    if (metric === 'NET_INCOME' || metric === 'GROSS_PROFIT') {
      if (Math.abs(val) >= 1e9) return `${(val / 1e9).toFixed(2)} مليار ج.م`;
      if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(2)} مليون ج.م`;
      return `${val.toLocaleString()} ج.م`;
    }
    if (metric === 'NET_PROFIT_MARGIN' || metric === 'CHANGE_PERCENT' || metric === 'UPSIDE_PERCENT') {
      return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
    }
    if (metric === 'VOLUME') {
      return `${Math.round(val).toLocaleString()} سهم`;
    }
    if (metric === 'PE_RATIO') {
      return `${val.toFixed(1)}x`;
    }
    return `${val.toFixed(2)} ج.م`;
  }

  public formatSourceMetric(src: SourcePriceData | undefined, metric: ComparatorMetricType): string {
    if (!src) return '—';
    switch (metric) {
      case 'NET_INCOME':
        return (src.netIncome !== undefined) ? this.formatCurrencyOrNumber(src.netIncome, metric) : '—';
      case 'NET_PROFIT_MARGIN':
        return (src.netProfitMargin !== undefined) ? `${src.netProfitMargin >= 0 ? '+' : ''}${src.netProfitMargin}%` : '—';
      case 'GROSS_PROFIT':
        return (src.grossProfit !== undefined) ? this.formatCurrencyOrNumber(src.grossProfit, metric) : '—';
      case 'PRICE':
        return `${src.price} ج.م`;
      case 'FAIR_VALUE':
        return src.fairValue ? `${src.fairValue} ج.م` : '—';
      case 'FAIR_VALUE_GRAHAM':
        return src.fairValueGraham ? `${src.fairValueGraham} ج.م` : '—';
      case 'FAIR_VALUE_PE':
        return src.fairValuePE ? `${src.fairValuePE} ج.م` : '—';
      case 'FAIR_VALUE_LYNCH':
        return src.fairValueLynch ? `${src.fairValueLynch} ج.م` : '—';
      case 'FAIR_VALUE_PB':
        return src.fairValuePB ? `${src.fairValuePB} ج.م` : '—';
      case 'UPSIDE_PERCENT':
        return (src.upsidePercent !== undefined) ? `${src.upsidePercent >= 0 ? '+' : ''}${src.upsidePercent}%` : '—';
      case 'CHANGE_PERCENT':
        return `${src.changePercent >= 0 ? '+' : ''}${src.changePercent}%`;
      case 'VOLUME':
        return `${(src.volume || 0).toLocaleString()}`;
      case 'DAY_HIGH':
        return src.dayHigh ? `${src.dayHigh} ج.م` : '—';
      case 'DAY_LOW':
        return src.dayLow ? `${src.dayLow} ج.م` : '—';
      case 'PE_RATIO':
        return src.peRatio ? `${src.peRatio}x` : '—';
      case 'EPS':
        return src.eps ? `${src.eps} ج.م` : '—';
      default:
        return `${src.price} ج.م`;
    }
  }

  public formatStockConsensus(stock: PriceComparisonResult, metric: ComparatorMetricType): string {
    switch (metric) {
      case 'NET_INCOME':
        return (stock.averageNetIncome !== undefined) ? this.formatCurrencyOrNumber(stock.averageNetIncome, metric) : '—';
      case 'NET_PROFIT_MARGIN':
        return (stock.averageNetProfitMargin !== undefined) ? `${stock.averageNetProfitMargin >= 0 ? '+' : ''}${stock.averageNetProfitMargin}%` : '—';
      case 'GROSS_PROFIT':
        return (stock.averageGrossProfit !== undefined) ? this.formatCurrencyOrNumber(stock.averageGrossProfit, metric) : '—';
      case 'PRICE':
        return `${stock.averagePrice} ج.م`;
      case 'FAIR_VALUE':
        return stock.averageFairValue ? `${stock.averageFairValue} ج.م` : '—';
      case 'FAIR_VALUE_GRAHAM':
        return stock.averageFairValueGraham ? `${stock.averageFairValueGraham} ج.م` : '—';
      case 'FAIR_VALUE_PE':
        return stock.averageFairValuePE ? `${stock.averageFairValuePE} ج.م` : '—';
      case 'FAIR_VALUE_LYNCH':
        return stock.averageFairValueLynch ? `${stock.averageFairValueLynch} ج.م` : '—';
      case 'FAIR_VALUE_PB':
        return stock.averageFairValuePB ? `${stock.averageFairValuePB} ج.م` : '—';
      case 'UPSIDE_PERCENT':
        return (stock.averageUpsidePercent !== undefined) ? `${stock.averageUpsidePercent >= 0 ? '+' : ''}${stock.averageUpsidePercent}%` : '—';
      case 'VOLUME':
        return `${stock.maxVolume.toLocaleString()} سهم`;
      case 'CHANGE_PERCENT':
        const chg = stock.sources['tradingview']?.changePercent ?? stock.sources['egx']?.changePercent ?? 0;
        return `${chg >= 0 ? '+' : ''}${chg}%`;
      case 'DAY_HIGH':
        return `${stock.sources['tradingview']?.dayHigh || stock.averagePrice} ج.م`;
      case 'DAY_LOW':
        return `${stock.sources['tradingview']?.dayLow || stock.averagePrice} ج.م`;
      case 'PE_RATIO':
        return stock.averagePeRatio ? `${stock.averagePeRatio}x` : '—';
      case 'EPS':
        return stock.averageEps ? `${stock.averageEps} ج.م` : '—';
      default:
        return `${stock.averagePrice} ج.م`;
    }
  }

  public getMetricColorClass(src: SourcePriceData | undefined, metric: ComparatorMetricType): string {
    if (!src) return 'text-gray-500';
    if (metric === 'NET_INCOME') {
      const net = src.netIncome ?? 0;
      return net > 0 ? 'text-emerald-300 font-bold' : (net < 0 ? 'text-rose-400' : 'text-gray-400');
    }
    if (metric === 'NET_PROFIT_MARGIN') {
      const m = src.netProfitMargin ?? 0;
      return m >= 20 ? 'text-emerald-300 font-black' : (m >= 0 ? 'text-emerald-400' : 'text-rose-400');
    }
    if (metric === 'CHANGE_PERCENT') {
      return src.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400';
    }
    if (metric === 'UPSIDE_PERCENT') {
      const up = src.upsidePercent ?? 0;
      return up >= 15 ? 'text-emerald-300 font-black' : (up >= 0 ? 'text-emerald-400' : 'text-rose-400');
    }
    if (metric.startsWith('FAIR_VALUE')) {
      return 'text-emerald-400';
    }
    if (metric === 'VOLUME' || metric === 'GROSS_PROFIT') {
      return 'text-gray-200';
    }
    return 'text-white';
  }

  public openDetail(stock: PriceComparisonResult): void {
    this.selectedStock.set(stock);
    this.detailModalVisible = true;
  }

  public getSourceKeys(stock: PriceComparisonResult): string[] {
    return Object.keys(stock.sources || {});
  }

  public getSourceName(key: string): string {
    const map: Record<string, string> = {
      egx: 'البورصة المصرية EGX Official',
      tradingview: 'TradingView Scanner',
      mubasher: 'مباشر مصر Mubasher',
      investing: 'Investing.com Live',
      yahoo: 'Yahoo Finance'
    };
    return map[key] || key;
  }

  public getSourceIcon(key: string): string {
    const map: Record<string, string> = {
      egx: '🏛️',
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
    const metric = this.selectedMetric();
    const metricLabel = this.activeMetricInfo().shortLabel;

    const headers = [
      'Symbol', 'Name (AR)', 'Name (EN)', 'Sector',
      `EGX (${metricLabel})`, `TradingView (${metricLabel})`, `Mubasher (${metricLabel})`,
      `Investing (${metricLabel})`, `Yahoo (${metricLabel})`,
      `Consensus (${metricLabel})`, 'Price Spread %', 'Volume'
    ];

    const rows = list.map(s => [
      s.symbol,
      `"${s.nameAr}"`,
      `"${s.nameEn}"`,
      `"${s.sector}"`,
      this.formatSourceMetric(s.sources['egx'], metric),
      this.formatSourceMetric(s.sources['tradingview'], metric),
      this.formatSourceMetric(s.sources['mubasher'], metric),
      this.formatSourceMetric(s.sources['investing'], metric),
      this.formatSourceMetric(s.sources['yahoo'], metric),
      this.formatStockConsensus(s, metric),
      s.priceSpreadPercent,
      s.maxVolume
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EGX_MultiSource_${metric}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
