import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { StockApiService } from '../../core/services/stock-api.service';
import { SectorRotationGroup, SectorRotationStock, RotationPhaseType } from '../../core/models/stock.model';

@Component({
  selector: 'app-sector-rotation',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, InputTextModule],
  template: `
    <div class="space-y-6 pb-16">
      <!-- Page Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span class="text-2xl">🔄</span>
            <span>رادار تدوير وتدفق السيولة القطاعية (Sector Liquidity Rotation Radar)</span>
          </h2>
          <p class="text-xs sm:text-sm text-gray-400">
            تحليل تدفقات السيولة اللحظية وحصص القطاعات واكتشاف القطاعات المرشحة لدخول السيولة المؤسسية (تجميع وايكوف الصامت)
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Refresh Button -->
          <button (click)="loadData(true)"
                  [disabled]="apiService.sectorRotationLoading()"
                  title="إعادة فحص وتحديث بيانات دوران السيولة لحظياً"
                  class="bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer">
            <i [class]="apiService.sectorRotationLoading() ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"></i>
            <span>{{ apiService.sectorRotationLoading() ? 'جاري الفحص...' : '⚡ تحديث شامل للسيولة' }}</span>
          </button>

          <!-- Export CSV -->
          <button (click)="exportCSV()"
                  [disabled]="sectors().length === 0"
                  class="bg-darkCard hover:bg-darkBorder text-gray-200 border border-darkBorder font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer">
            <i class="pi pi-download text-emeraldAccent"></i>
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      <!-- Top Market KPI Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" *ngIf="summary() as sum">
        <!-- 1. Total Market Turnover -->
        <div class="glass-card p-4 rounded-2xl border border-darkBorder bg-darkCard/60 relative overflow-hidden group">
          <div class="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-gray-400">إجمالي سيولة السوق (Turnover)</span>
            <span class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm">💵</span>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-xl sm:text-2xl font-black text-white" dir="ltr">
              {{ formatTurnover(sum.totalMarketTurnover) }}
            </span>
          </div>
          <p class="text-[11px] text-gray-400 mt-1">
            إجمالي قيمة التداولات لـ {{ sum.totalStocksCount }} سهم
          </p>
        </div>

        <!-- 2. Leading Sector by Liquidity Share -->
        <div class="glass-card p-4 rounded-2xl border border-darkBorder bg-darkCard/60 relative overflow-hidden group">
          <div class="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-gray-400">القطاع المتصدر للسيولة الحالية</span>
            <span class="p-2 rounded-xl bg-blue-500/10 text-blue-400 text-sm">{{ sum.leadingSector.icon || '🏆' }}</span>
          </div>
          <div class="mt-2">
            <span class="text-base sm:text-lg font-black text-white truncate block">
              {{ sum.leadingSector.nameAr || '—' }}
            </span>
          </div>
          <div class="flex items-center justify-between text-[11px] text-gray-400 mt-1">
            <span>حصة السيولة:</span>
            <span class="text-blue-400 font-bold font-mono">{{ sum.leadingSector.liquiditySharePercent || 0 }}%</span>
          </div>
        </div>

        <!-- 3. Top Accumulation / Next in Line -->
        <div class="glass-card p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 relative overflow-hidden group shadow-lg shadow-emerald-950/30">
          <div class="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all"></div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-emerald-300 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              المرشح الأول لدخول السيولة التالي
            </span>
            <span class="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm">🎯</span>
          </div>
          <div class="mt-2">
            <span class="text-base sm:text-lg font-black text-emerald-300 truncate block">
              {{ sum.topAccumulationSector.nameAr || '—' }}
            </span>
          </div>
          <div class="flex items-center justify-between text-[11px] text-gray-300 mt-1">
            <span>درجة التجميع: <strong class="text-emerald-400">{{ sum.topAccumulationSector.rotationScore || 0 }}/100</strong></span>
            <span>تدفق: <strong class="text-emerald-400">{{ sum.topAccumulationSector.avgVolumeSurge || 1 }}x</strong></span>
          </div>
        </div>

        <!-- 4. Sectors Monitored -->
        <div class="glass-card p-4 rounded-2xl border border-darkBorder bg-darkCard/60 relative overflow-hidden group">
          <div class="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all"></div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-gray-400">القطاعات الممسوحة لحظياً</span>
            <span class="p-2 rounded-xl bg-purple-500/10 text-purple-400 text-sm">🌐</span>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-xl sm:text-2xl font-black text-white">
              {{ sum.totalSectorsCount || 21 }} قطاعاً
            </span>
          </div>
          <p class="text-[11px] text-gray-400 mt-1">
            تحديث مباشر مع كل جلسة تداول
          </p>
        </div>
      </div>

      <!-- Filters & Sorting Toolbar -->
      <div class="glass-card p-4 rounded-2xl border border-darkBorder bg-darkCard/50 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Phase Filter Pills -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <button (click)="selectedPhaseFilter.set('ALL')"
                    [class.bg-emerald-600]="selectedPhaseFilter() === 'ALL'"
                    [class.text-black]="selectedPhaseFilter() === 'ALL'"
                    [class.font-black]="selectedPhaseFilter() === 'ALL'"
                    [class.bg-darkBg]="selectedPhaseFilter() !== 'ALL'"
                    [class.text-gray-300]="selectedPhaseFilter() !== 'ALL'"
                    class="px-3 py-1.5 rounded-xl text-xs border border-darkBorder transition-all cursor-pointer">
              🌐 جميع القطاعات ({{ sectors().length }})
            </button>
            <button (click)="selectedPhaseFilter.set('ACCUMULATION')"
                    [class.bg-emerald-500]="selectedPhaseFilter() === 'ACCUMULATION'"
                    [class.text-black]="selectedPhaseFilter() === 'ACCUMULATION'"
                    [class.font-black]="selectedPhaseFilter() === 'ACCUMULATION'"
                    [class.bg-darkBg]="selectedPhaseFilter() !== 'ACCUMULATION'"
                    [class.text-emerald-300]="selectedPhaseFilter() !== 'ACCUMULATION'"
                    class="px-3 py-1.5 rounded-xl text-xs border border-emerald-500/30 transition-all cursor-pointer">
              🎯 تجميع صامت - المرشح التالي ({{ countByPhase('ACCUMULATION') }})
            </button>
            <button (click)="selectedPhaseFilter.set('MARKUP')"
                    [class.bg-cyan-500]="selectedPhaseFilter() === 'MARKUP'"
                    [class.text-black]="selectedPhaseFilter() === 'MARKUP'"
                    [class.font-black]="selectedPhaseFilter() === 'MARKUP'"
                    [class.bg-darkBg]="selectedPhaseFilter() !== 'MARKUP'"
                    [class.text-cyan-300]="selectedPhaseFilter() !== 'MARKUP'"
                    class="px-3 py-1.5 rounded-xl text-xs border border-cyan-500/30 transition-all cursor-pointer">
              🚀 انطلاق وزخم نشط ({{ countByPhase('MARKUP') }})
            </button>
            <button (click)="selectedPhaseFilter.set('DISTRIBUTION')"
                    [class.bg-amber-500]="selectedPhaseFilter() === 'DISTRIBUTION'"
                    [class.text-black]="selectedPhaseFilter() === 'DISTRIBUTION'"
                    [class.font-black]="selectedPhaseFilter() === 'DISTRIBUTION'"
                    [class.bg-darkBg]="selectedPhaseFilter() !== 'DISTRIBUTION'"
                    [class.text-amber-300]="selectedPhaseFilter() !== 'DISTRIBUTION'"
                    class="px-3 py-1.5 rounded-xl text-xs border border-amber-500/30 transition-all cursor-pointer">
              ⚠️ تشبع وتصريف ({{ countByPhase('DISTRIBUTION') }})
            </button>
            <button (click)="selectedPhaseFilter.set('BASE_BUILDING')"
                    [class.bg-purple-600]="selectedPhaseFilter() === 'BASE_BUILDING'"
                    [class.text-white]="selectedPhaseFilter() === 'BASE_BUILDING'"
                    [class.font-black]="selectedPhaseFilter() === 'BASE_BUILDING'"
                    [class.bg-darkBg]="selectedPhaseFilter() !== 'BASE_BUILDING'"
                    [class.text-gray-400]="selectedPhaseFilter() !== 'BASE_BUILDING'"
                    class="px-3 py-1.5 rounded-xl text-xs border border-darkBorder transition-all cursor-pointer">
              💤 قاع وانتظار ({{ countByPhase('BASE_BUILDING') }})
            </button>
          </div>

          <!-- Sort Selector & Search -->
          <div class="flex items-center gap-2 flex-wrap">
            <div class="flex items-center gap-1.5 bg-darkBg px-3 py-1.5 rounded-xl border border-darkBorder text-xs">
              <span class="text-gray-400 font-medium">الترتيب حسب:</span>
              <select [ngModel]="sortBy()"
                      (ngModelChange)="sortBy.set($event)"
                      class="bg-transparent text-emeraldAccent font-bold focus:outline-none cursor-pointer">
                <option value="ROTATION_SCORE" class="bg-darkCard text-white">🎯 درجة الترشيح للسيولة (Rotation Score)</option>
                <option value="LIQUIDITY_SHARE" class="bg-darkCard text-white">💰 أعلى حصة سيولة (Liquidity Share %)</option>
                <option value="VOLUME_SURGE" class="bg-darkCard text-white">⚡ أعلى تدفق غير معتاد (Volume Surge)</option>
                <option value="UPSIDE_PERCENT" class="bg-darkCard text-white">🚀 أعلى نمو وقيمة عادلة (Upside %)</option>
                <option value="PRICE_CHANGE" class="bg-darkCard text-white">📈 أعلى أداء سعري اليوم (Change %)</option>
              </select>
            </div>

            <div class="relative">
              <input type="text"
                     [ngModel]="searchQuery()"
                     (ngModelChange)="searchQuery.set($event)"
                     placeholder="بحث باسم القطاع أو السهم..."
                     class="bg-darkBg border border-darkBorder rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emeraldAccent w-44 sm:w-56" />
              <i class="pi pi-search absolute left-3 top-2.5 text-gray-500 text-xs"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Sector Rotation Cards Grid -->
      <div class="space-y-4">
        <div *ngFor="let sector of filteredSectors()"
             class="glass-card rounded-2xl border transition-all duration-200 overflow-hidden"
             [class.border-emerald-500]="sector.rotationPhase === 'ACCUMULATION'"
             [class.border-cyan-500]="sector.rotationPhase === 'MARKUP'"
             [class.border-amber-500]="sector.rotationPhase === 'DISTRIBUTION'"
             [class.border-darkBorder]="sector.rotationPhase === 'BASE_BUILDING'"
             [class.bg-darkCard/70]="true">

          <!-- Card Header & Summary Bar -->
          <div class="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
               (click)="toggleSectorExpand(sector.sectorKey)">

            <!-- Left: Sector Name, Icon & Phase Badge -->
            <div class="flex items-center gap-3 min-w-[280px]">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                   [class.bg-emerald-500/10]="sector.rotationPhase === 'ACCUMULATION'"
                   [class.bg-cyan-500/10]="sector.rotationPhase === 'MARKUP'"
                   [class.bg-amber-500/10]="sector.rotationPhase === 'DISTRIBUTION'"
                   [class.bg-purple-500/10]="sector.rotationPhase === 'BASE_BUILDING'">
                {{ sector.icon }}
              </div>

              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-base sm:text-lg font-black text-white">
                    {{ sector.nameAr }}
                  </h3>
                  <span class="text-xs text-gray-400 font-mono">({{ sector.stocksCount }} سهم)</span>
                </div>
                
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  <!-- Phase Badge -->
                  <span class="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border"
                        [class.bg-emerald-500/10]="sector.rotationPhase === 'ACCUMULATION'"
                        [class.text-emerald-400]="sector.rotationPhase === 'ACCUMULATION'"
                        [class.border-emerald-500/30]="sector.rotationPhase === 'ACCUMULATION'"
                        [class.bg-cyan-500/10]="sector.rotationPhase === 'MARKUP'"
                        [class.text-cyan-400]="sector.rotationPhase === 'MARKUP'"
                        [class.border-cyan-500/30]="sector.rotationPhase === 'MARKUP'"
                        [class.bg-amber-500/10]="sector.rotationPhase === 'DISTRIBUTION'"
                        [class.text-amber-400]="sector.rotationPhase === 'DISTRIBUTION'"
                        [class.border-amber-500/30]="sector.rotationPhase === 'DISTRIBUTION'"
                        [class.bg-gray-800]="sector.rotationPhase === 'BASE_BUILDING'"
                        [class.text-gray-300]="sector.rotationPhase === 'BASE_BUILDING'"
                        [class.border-gray-700]="sector.rotationPhase === 'BASE_BUILDING'">
                    <span class="w-1.5 h-1.5 rounded-full"
                          [class.bg-emerald-400]="sector.rotationPhase === 'ACCUMULATION'"
                          [class.animate-pulse]="sector.rotationPhase === 'ACCUMULATION'"
                          [class.bg-cyan-400]="sector.rotationPhase === 'MARKUP'"
                          [class.bg-amber-400]="sector.rotationPhase === 'DISTRIBUTION'"
                          [class.bg-gray-400]="sector.rotationPhase === 'BASE_BUILDING'"></span>
                    {{ sector.phaseLabelAr }}
                  </span>

                  <!-- Phase Explanation Snippet -->
                  <span class="text-[11px] text-gray-400 hidden md:inline">
                    {{ sector.phaseDescriptionAr }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Middle: Rotation Potential Score (Scorecard) -->
            <div class="flex items-center gap-4">
              <div class="text-center">
                <div class="text-[11px] font-bold text-gray-400 mb-0.5">درجة ترشيح السيولة</div>
                <div class="flex items-center gap-1.5">
                  <div class="w-16 sm:w-20 bg-darkBg rounded-full h-2.5 overflow-hidden border border-darkBorder">
                    <div class="h-full rounded-full transition-all duration-500"
                         [style.width.%]="sector.rotationScore"
                         [class.bg-emerald-400]="sector.rotationScore >= 70"
                         [class.bg-amber-400]="sector.rotationScore >= 40 && sector.rotationScore < 70"
                         [class.bg-gray-500]="sector.rotationScore < 40">
                    </div>
                  </div>
                  <span class="text-sm sm:text-base font-black font-mono"
                        [class.text-emerald-400]="sector.rotationScore >= 70"
                        [class.text-amber-400]="sector.rotationScore >= 40 && sector.rotationScore < 70"
                        [class.text-gray-400]="sector.rotationScore < 40">
                    {{ sector.rotationScore }}
                  </span>
                </div>
              </div>

              <!-- Liquidity Share -->
              <div class="text-center min-w-[90px]">
                <div class="text-[11px] font-bold text-gray-400 mb-0.5">حصة السيولة %</div>
                <span class="text-sm sm:text-base font-black text-blue-400 font-mono">
                  {{ sector.liquiditySharePercent }}%
                </span>
                <span class="text-[10px] text-gray-400 block" dir="ltr">{{ formatTurnover(sector.totalTurnoverEgp) }}</span>
              </div>

              <!-- Volume Surge Factor -->
              <div class="text-center min-w-[80px]">
                <div class="text-[11px] font-bold text-gray-400 mb-0.5">تدفق السيولة</div>
                <span class="text-sm sm:text-base font-black font-mono"
                      [class.text-emerald-400]="sector.avgVolumeSurge >= 1.3"
                      [class.text-cyan-400]="sector.avgVolumeSurge >= 1.0 && sector.avgVolumeSurge < 1.3"
                      [class.text-gray-400]="sector.avgVolumeSurge < 1.0">
                  {{ sector.avgVolumeSurge }}x
                </span>
                <span class="text-[10px] text-gray-400 block">مقابل متوسط 10 أيام</span>
              </div>

              <!-- Fair Value Upside % -->
              <div class="text-center min-w-[80px] hidden sm:block">
                <div class="text-[11px] font-bold text-gray-400 mb-0.5">النمو للقيمة العادلة</div>
                <span class="text-sm sm:text-base font-black font-mono"
                      [class.text-emerald-400]="sector.avgUpsidePercent > 20"
                      [class.text-amber-400]="sector.avgUpsidePercent >= 0 && sector.avgUpsidePercent <= 20"
                      [class.text-rose-400]="sector.avgUpsidePercent < 0">
                  {{ sector.avgUpsidePercent > 0 ? '+' : '' }}{{ sector.avgUpsidePercent }}%
                </span>
              </div>

              <!-- Price Change % -->
              <div class="text-center min-w-[70px] hidden sm:block">
                <div class="text-[11px] font-bold text-gray-400 mb-0.5">تغير اليوم</div>
                <span class="text-sm sm:text-base font-black font-mono"
                      [class.text-emerald-400]="sector.avgPriceChange > 0"
                      [class.text-rose-400]="sector.avgPriceChange < 0"
                      [class.text-gray-400]="sector.avgPriceChange === 0">
                  {{ sector.avgPriceChange > 0 ? '+' : '' }}{{ sector.avgPriceChange }}%
                </span>
              </div>

              <!-- Expand/Collapse Icon -->
              <button class="p-2 rounded-lg bg-darkBg text-gray-400 hover:text-white transition-colors cursor-pointer">
                <i [class]="expandedSectors().has(sector.sectorKey) ? 'pi pi-chevron-up text-emeraldAccent' : 'pi pi-chevron-down'"></i>
              </button>
            </div>
          </div>

          <!-- Expandable Constituent Stocks Accordion -->
          <div *ngIf="expandedSectors().has(sector.sectorKey)"
               class="border-t border-darkBorder/60 bg-darkBg/60 p-4 sm:p-5 space-y-4">

            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-gray-300">
                  📋 أسهم قطاع {{ sector.nameAr }} (مرتبة حسب حجم السيولة المتداولة):
                </span>
              </div>
              <span class="text-[11px] text-gray-400">
                ⚡ الأسهم ذات التدفق غير المعتاد (Surge > 1.3x) محددة بالأخضر كقادة لحركة السيولة
              </span>
            </div>

            <!-- Stocks Mini Table -->
            <div class="overflow-x-auto rounded-xl border border-darkBorder/80">
              <table class="w-full text-xs text-right">
                <thead class="bg-darkCard/90 text-gray-400 border-b border-darkBorder font-bold">
                  <tr>
                    <th class="p-2.5">السهم</th>
                    <th class="p-2.5 text-center">السعر اللحظي</th>
                    <th class="p-2.5 text-center">التغير %</th>
                    <th class="p-2.5 text-center">تدفق السيولة (Surge)</th>
                    <th class="p-2.5 text-center">قيمة التداول اليوم</th>
                    <th class="p-2.5 text-center">مؤشر RSI</th>
                    <th class="p-2.5 text-center">القيمة العادلة</th>
                    <th class="p-2.5 text-center">النمو المتوقع %</th>
                    <th class="p-2.5 text-center">مكرر الربحية P/E</th>
                    <th class="p-2.5 text-center">صافي الأرباح TTM</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-darkBorder/50">
                  <tr *ngFor="let s of sector.stocks"
                      class="hover:bg-white/[0.03] transition-colors"
                      [class.bg-emerald-500/5]="s.volumeSurge >= 1.3">
                    <!-- Symbol & Name -->
                    <td class="p-2.5 font-bold">
                      <div class="flex items-center gap-2">
                        <span class="text-emeraldAccent font-mono">{{ s.symbol }}</span>
                        <span class="text-gray-300 text-[11px] truncate max-w-[140px]">{{ s.nameAr }}</span>
                        <span *ngIf="s.volumeSurge >= 1.5"
                              class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-black border border-emerald-500/40">
                          🔥 قائد سيولة
                        </span>
                      </div>
                    </td>

                    <!-- Price -->
                    <td class="p-2.5 text-center font-mono font-bold text-white">
                      {{ s.price }} ج.م
                    </td>

                    <!-- Change % -->
                    <td class="p-2.5 text-center font-mono font-bold"
                        [class.text-emerald-400]="s.changePercent > 0"
                        [class.text-rose-400]="s.changePercent < 0"
                        [class.text-gray-400]="s.changePercent === 0">
                      {{ s.changePercent > 0 ? '+' : '' }}{{ s.changePercent }}%
                    </td>

                    <!-- Volume Surge Factor -->
                    <td class="p-2.5 text-center font-mono font-black"
                        [class.text-emerald-400]="s.volumeSurge >= 1.3"
                        [class.text-cyan-400]="s.volumeSurge >= 1.0 && s.volumeSurge < 1.3"
                        [class.text-gray-400]="s.volumeSurge < 1.0">
                      {{ s.volumeSurge }}x
                    </td>

                    <!-- Turnover -->
                    <td class="p-2.5 text-center font-mono text-gray-300" dir="ltr">
                      {{ formatTurnover(s.turnoverEgp) }}
                    </td>

                    <!-- RSI -->
                    <td class="p-2.5 text-center font-mono">
                      <span *ngIf="s.rsi !== undefined"
                            class="px-2 py-0.5 rounded text-[11px] font-bold"
                            [class.bg-rose-500/20]="s.rsi >= 70"
                            [class.text-rose-400]="s.rsi >= 70"
                            [class.bg-emerald-500/20]="s.rsi <= 35"
                            [class.text-emerald-400]="s.rsi <= 35"
                            [class.text-gray-300]="s.rsi > 35 && s.rsi < 70">
                        {{ s.rsi }}
                      </span>
                      <span *ngIf="s.rsi === undefined" class="text-gray-500">—</span>
                    </td>

                    <!-- Fair Value -->
                    <td class="p-2.5 text-center font-mono font-bold text-amber-300">
                      {{ s.fairValue ? s.fairValue + ' ج.م' : '—' }}
                    </td>

                    <!-- Upside % -->
                    <td class="p-2.5 text-center font-mono font-black"
                        [class.text-emerald-400]="s.upsidePercent > 20"
                        [class.text-amber-400]="s.upsidePercent >= 0 && s.upsidePercent <= 20"
                        [class.text-rose-400]="s.upsidePercent < 0">
                      {{ s.upsidePercent > 0 ? '+' : '' }}{{ s.upsidePercent }}%
                    </td>

                    <!-- P/E -->
                    <td class="p-2.5 text-center font-mono text-gray-300">
                      {{ s.peRatio ? s.peRatio + 'x' : '—' }}
                    </td>

                    <!-- Net Income -->
                    <td class="p-2.5 text-center font-mono text-xs">
                      <span *ngIf="s.netIncome !== undefined"
                            [class.text-emerald-400]="s.netIncome > 0"
                            [class.text-rose-400]="s.netIncome < 0">
                        {{ formatCurrencyOrNumber(s.netIncome) }}
                      </span>
                      <span *ngIf="s.netIncome === undefined" class="text-gray-500">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Methodology and Educational Box -->
      <div class="glass-card p-5 rounded-2xl border border-darkBorder/80 bg-darkCard/40 space-y-3">
        <h4 class="text-sm font-extrabold text-emeraldAccent flex items-center gap-2">
          <span>💡</span>
          <span>منهجية رادار تدوير السيولة القطاعية (Sector Liquidity Rotation Methodology):</span>
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-300">
          <div class="bg-darkBg/60 p-3 rounded-xl border border-darkBorder/60">
            <strong class="text-emerald-400 block mb-1">🎯 مرحلة التجميع (Accumulation)</strong>
            <span>ارتفاع معدل تدفق السيولة (Surge ≥ 1.3x) مع ثبات الأسعار وارتفاع القيمة العادلة — مرحلة الدخول المؤسسي الصامت قبل الانطلاق.</span>
          </div>
          <div class="bg-darkBg/60 p-3 rounded-xl border border-darkBorder/60">
            <strong class="text-cyan-400 block mb-1">🚀 مرحلة الانطلاق (Markup)</strong>
            <span>سيولة مرتفعة مصحوبة بصعود سعري قوي — القطاع في قمة الزخم ويقود صعود المؤشر العام.</span>
          </div>
          <div class="bg-darkBg/60 p-3 rounded-xl border border-darkBorder/60">
            <strong class="text-amber-400 block mb-1">⚠️ مرحلة التصريف (Distribution)</strong>
            <span>وصول مؤشر RSI إلى مناطق تشبع شرائي (> 70) أو صعود سعري مع تراجع أحجام التداول — إشارة لقرب انتقال السيولة لقطاع آخر.</span>
          </div>
          <div class="bg-darkBg/60 p-3 rounded-xl border border-darkBorder/60">
            <strong class="text-gray-400 block mb-1">💤 مرحلة القاع والهدوء (Base Building)</strong>
            <span>تداول هادئ ضمن النطاق المعتاد بانتظار دورة التدوير القادمة.</span>
          </div>
        </div>
        <p class="text-[11px] text-gray-500 pt-1">
          * ملاحظة فنية: يتم حساب معدل تدفق السيولة (Volume Surge) بمقارنة أحجام تداول جلسة اليوم بالمتوسط الحسابي لعشر جلسات سابقة (10-Day Avg Volume) عبر مسح لحظي لجميع أسهم البورصة المصرية.
        </p>
      </div>
    </div>
  `
})
export class SectorRotationComponent implements OnInit {
  public apiService = inject(StockApiService);

  public selectedPhaseFilter = signal<'ALL' | RotationPhaseType>('ALL');
  public sortBy = signal<'ROTATION_SCORE' | 'LIQUIDITY_SHARE' | 'VOLUME_SURGE' | 'UPSIDE_PERCENT' | 'PRICE_CHANGE'>('ROTATION_SCORE');
  public searchQuery = signal<string>('');
  public expandedSectors = signal<Set<string>>(new Set());

  public summary = computed(() => this.apiService.sectorRotation()?.summary || null);
  public sectors = computed(() => this.apiService.sectorRotation()?.sectors || []);

  public filteredSectors = computed(() => {
    let list = this.sectors();
    const phase = this.selectedPhaseFilter();
    const query = this.searchQuery().trim().toLowerCase();

    // 1. Filter by phase
    if (phase !== 'ALL') {
      list = list.filter(s => s.rotationPhase === phase);
    }

    // 2. Filter by search query (matches sector name or constituent stocks)
    if (query) {
      list = list.filter(s => 
        s.nameAr.toLowerCase().includes(query) ||
        s.nameEn.toLowerCase().includes(query) ||
        s.stocks.some(st => st.symbol.toLowerCase().includes(query) || st.nameAr.toLowerCase().includes(query))
      );
    }

    // 3. Sort
    const sort = this.sortBy();
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'ROTATION_SCORE':
          return b.rotationScore - a.rotationScore;
        case 'LIQUIDITY_SHARE':
          return b.totalTurnoverEgp - a.totalTurnoverEgp;
        case 'VOLUME_SURGE':
          return b.avgVolumeSurge - a.avgVolumeSurge;
        case 'UPSIDE_PERCENT':
          return b.avgUpsidePercent - a.avgUpsidePercent;
        case 'PRICE_CHANGE':
          return b.avgPriceChange - a.avgPriceChange;
        default:
          return b.rotationScore - a.rotationScore;
      }
    });
  });

  ngOnInit(): void {
    if (!this.apiService.sectorRotation()) {
      this.loadData();
    }
  }

  public loadData(force: boolean = false): void {
    this.apiService.loadSectorRotation(force);
  }

  public toggleSectorExpand(sectorKey: string): void {
    const set = new Set(this.expandedSectors());
    if (set.has(sectorKey)) {
      set.delete(sectorKey);
    } else {
      set.add(sectorKey);
    }
    this.expandedSectors.set(set);
  }

  public countByPhase(phase: RotationPhaseType): number {
    return this.sectors().filter(s => s.rotationPhase === phase).length;
  }

  public formatTurnover(val: number | undefined): string {
    if (val === undefined || isNaN(val)) return '—';
    if (Math.abs(val) >= 1_000_000_000) {
      return (val / 1_000_000_000).toFixed(2) + ' مليار ج.م';
    }
    if (Math.abs(val) >= 1_000_000) {
      return (val / 1_000_000).toFixed(2) + ' مليون ج.م';
    }
    return val.toLocaleString('en-US') + ' ج.م';
  }

  public formatCurrencyOrNumber(val: number | undefined): string {
    if (val === undefined || isNaN(val)) return '—';
    if (Math.abs(val) >= 1_000_000_000) {
      return (val / 1_000_000_000).toFixed(2) + ' مليار ج.م';
    }
    if (Math.abs(val) >= 1_000_000) {
      return (val / 1_000_000).toFixed(2) + ' مليون ج.م';
    }
    return val.toLocaleString('en-US') + ' ج.م';
  }

  public exportCSV(): void {
    const list = this.filteredSectors();
    if (list.length === 0) return;

    let csv = 'Sector,Arabic Name,Phase,Rotation Score,Liquidity Share %,Turnover EGP,Volume Surge Factor,Avg Price Change %,Avg Upside %,Avg P/E,Stocks Count\n';
    for (const s of list) {
      csv += `"${s.sectorKey}","${s.nameAr}","${s.phaseLabelAr}",${s.rotationScore},${s.liquiditySharePercent},${s.totalTurnoverEgp},${s.avgVolumeSurge},${s.avgPriceChange},${s.avgUpsidePercent},${s.avgPe || ''},${s.stocksCount}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `EGX_Sector_Rotation_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
