import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StockApiService } from '../../core/services/stock-api.service';
import { StockModalComponent } from '../../shared/components/stock-modal/stock-modal.component';
import { StockAnalysisResult, SignalType } from '../../core/models/stock.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StockModalComponent],
  template: `
    <div class="space-y-8 pb-12">
      <!-- Hero Banner -->
      <div class="relative overflow-hidden glass-card rounded-3xl p-6 sm:p-10 border border-emeraldAccent/20">
        <div class="absolute -top-24 -left-24 w-72 h-72 bg-emeraldAccent/20 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-24 -right-24 w-72 h-72 bg-cyanAccent/15 rounded-full blur-3xl"></div>

        <div class="relative z-10 max-w-3xl space-y-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all"
               [ngClass]="apiService.isUsingCache() ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300' : 'bg-emeraldAccent/10 border border-emeraldAccent/30 text-emeraldAccent'">
            <span class="w-2 h-2 rounded-full" [ngClass]="apiService.isUsingCache() ? 'bg-amber-400' : 'bg-emeraldAccent animate-pulse'"></span>
            {{ apiService.isUsingCache() ? '⚡ بيانات محفوظة مؤقتاً (Stale-While-Revalidate)' : '🟢 تحديث تلقائي مباشر للأسعار والقيم العادلة' }}
          </div>

          <h2 class="text-2xl sm:text-4xl font-black text-white leading-tight">
            ذكاء الاصطناعي لتحليل أسهم البورصة المصرية <br>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-emeraldAccent via-cyanAccent to-amberAccent">
              المتوافقة مع الشريعة الإسلامية 🕌
            </span>
          </h2>

          <p class="text-gray-300 text-sm sm:text-base leading-relaxed">
            منصة مجانية ومباشرة توفر حساب القيمة العادلة تلقائياً، إشارات الشراء والبيع الفنية، التدقيق الشرعي لأسهم EGX، وأسعار الذهب في مصر لحظة بلحظة.
          </p>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <a routerLink="/screener" class="bg-gradient-to-r from-emeraldAccent to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold px-6 py-3 rounded-xl shadow-lg shadow-emeraldAccent/20 transition-all text-sm flex items-center gap-2">
              <i class="pi pi-table"></i>
              تصفح الـ {{ apiService.stocks().length || 108 }} سهم حلال
            </a>
            <a routerLink="/gold" class="bg-darkCard hover:bg-darkBorder text-gray-200 font-bold px-5 py-3 rounded-xl border border-darkBorder transition-all text-sm flex items-center gap-2">
              <i class="pi pi-sun text-amberAccent"></i>
              أسعار الذهب اللحظية
            </a>
          </div>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card p-5 rounded-2xl border-l-4 border-l-emeraldAccent">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold mb-2">
            <span>الأسهم الحلال المتابعة</span>
            <i class="pi pi-check-circle text-emeraldAccent text-lg"></i>
          </div>
          <div class="text-2xl font-black text-white">{{ apiService.stocks().length || 108 }}</div>
          <span class="text-xs text-emeraldAccent font-semibold block mt-1">100% مطابقة لمعايير AAOIFI</span>
        </div>

        <div class="glass-card p-5 rounded-2xl border-l-4 border-l-cyanAccent">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold mb-2">
            <span>فرص الشراء الموصى بها</span>
            <i class="pi pi-bolt text-cyanAccent text-lg"></i>
          </div>
          <div class="text-2xl font-black text-cyanAccent">{{ apiService.topBuys().length }} أسهم</div>
          <span class="text-xs text-gray-400 block mt-1">تحليل فني + فارق قيمة عادلة</span>
        </div>

        <div class="glass-card p-5 rounded-2xl border-l-4 border-l-amberAccent">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold mb-2">
            <span>الذهب عيار 24</span>
            <i class="pi pi-sun text-amberAccent text-lg"></i>
          </div>
          <div class="text-2xl font-black text-amberAccent">{{ apiService.goldPrices()?.gold24kEgp }} ج.م</div>
          <span class="text-xs text-gray-400 block mt-1">الجرام بدون مصنعية</span>
        </div>

        <div class="glass-card p-5 rounded-2xl border-l-4 border-l-roseAccent">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold mb-2">
            <span>الدولار مقابل الجنيه</span>
            <i class="pi pi-dollar text-roseAccent text-lg"></i>
          </div>
          <div class="text-2xl font-black text-white">{{ apiService.usdEgp() }} ج.م</div>
          <span class="text-xs text-gray-400 block mt-1">سعر الصرف اللحظي</span>
        </div>
      </div>

      <!-- Top Recommended Buy Stocks Section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-black text-white flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-emeraldAccent"></span>
            ⭐ أفضل فرص الشراء الموصى بها حالياً (Top Buy Opportunities)
          </h3>
          <a routerLink="/screener" class="text-xs font-bold text-emeraldAccent hover:underline">عرض الكل ←</a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div *ngFor="let stock of apiService.topBuys()"
               (click)="selectStock(stock)"
               class="glass-card p-5 rounded-2xl hover:border-emeraldAccent/50 transition-all cursor-pointer group space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-black text-white text-base group-hover:text-emeraldAccent transition-colors">
                {{ stock.quote.symbol }}
              </span>
              <span class="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                🚀 شراء قوي
              </span>
            </div>

            <div>
              <h4 class="text-xs text-gray-300 font-semibold truncate">{{ stock.quote.nameAr }}</h4>
              <div class="flex items-baseline justify-between mt-2">
                <span class="text-xl font-black text-white">{{ stock.quote.currentPrice }} <small class="text-xs font-normal">ج.م</small></span>
                <span class="text-xs font-bold text-emeraldAccent">+{{ stock.fairValueUpsidePercent }}%</span>
              </div>
            </div>

            <div class="pt-2 border-t border-darkBorder/60 flex items-center justify-between text-xs text-gray-400">
              <span>القيمة العادلة: <strong class="text-emeraldAccent">{{ stock.fairValue }} ج.م</strong></span>
              <i class="pi pi-chevron-left group-hover:-translate-x-1 transition-transform"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- ⚡ Intraday Session Trading Recommendations Section -->
      <div class="space-y-5">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h3 class="text-lg font-black text-white flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-orange-400"></span>
            ⚡ توصيات المضاربة داخل الجلسة (Intraday Session Trading)
          </h3>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-400">تحليل لحظي للزخم وحجم التداول داخل الجلسة</span>
            <a routerLink="/intraday" class="text-xs font-bold text-orange-400 hover:underline">عرض الكل ←</a>
          </div>
        </div>

        <!-- Intraday Buy Opportunities -->
        <div class="space-y-3">
          <h4 class="text-sm font-bold text-emeraldAccent flex items-center gap-1.5">
            <i class="pi pi-arrow-up text-emeraldAccent"></i> 🟢 أفضل أسهم للمضاربة الشراء داخل الجلسة
          </h4>

          <div *ngIf="apiService.topIntradayBuys().length === 0" class="glass-card p-6 rounded-2xl text-center text-xs text-gray-400">
            <div class="text-2xl mb-2">📊</div>
            لا توجد فرص مضاربة شراء قوية في الجلسة الحالية - انتظر تكون الزخم
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div *ngFor="let stock of apiService.topIntradayBuys()"
                 (click)="selectStock(stock)"
                 class="glass-card p-5 rounded-2xl hover:border-orange-400/50 transition-all cursor-pointer group space-y-3 border-l-4 border-l-emeraldAccent">
              <div class="flex items-center justify-between">
                <span class="font-black text-white text-base group-hover:text-orange-400 transition-colors">
                  {{ stock.quote.symbol }}
                </span>
                <span [class]="getIntradaySignalBadgeClass(stock.intradaySignal!)" class="text-xs font-bold px-2.5 py-0.5 rounded-full border">
                  {{ getIntradaySignalLabel(stock.intradaySignal!) }}
                </span>
              </div>

              <div>
                <h4 class="text-xs text-gray-300 font-semibold truncate">{{ stock.quote.nameAr }}</h4>
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

              <div *ngIf="stock.intradayReasons && stock.intradayReasons.length > 0" class="text-[10px] text-gray-400 truncate">
                <span class="text-orange-400">⚡</span> {{ stock.intradayReasons[0] }}
              </div>
            </div>
          </div>
        </div>

        <!-- Intraday Sell/Avoid Opportunities -->
        <div class="space-y-3">
          <h4 class="text-sm font-bold text-roseAccent flex items-center gap-1.5">
            <i class="pi pi-arrow-down text-roseAccent"></i> 🔴 أسهم للمضاربة البيع / تجنب داخل الجلسة
          </h4>

          <div *ngIf="apiService.topIntradaySells().length === 0" class="glass-card p-6 rounded-2xl text-center text-xs text-gray-400">
            <div class="text-2xl mb-2">✅</div>
            لا توجد إشارات بيع قوية في الجلسة الحالية - السوق في وضع صاعد
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div *ngFor="let stock of apiService.topIntradaySells()"
                 (click)="selectStock(stock)"
                 class="glass-card p-5 rounded-2xl hover:border-rose-400/50 transition-all cursor-pointer group space-y-3 border-l-4 border-l-roseAccent">
              <div class="flex items-center justify-between">
                <span class="font-black text-white text-base group-hover:text-rose-400 transition-colors">
                  {{ stock.quote.symbol }}
                </span>
                <span [class]="getIntradaySignalBadgeClass(stock.intradaySignal!)" class="text-xs font-bold px-2.5 py-0.5 rounded-full border">
                  {{ getIntradaySignalLabel(stock.intradaySignal!) }}
                </span>
              </div>

              <div>
                <h4 class="text-xs text-gray-300 font-semibold truncate">{{ stock.quote.nameAr }}</h4>
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

              <div *ngIf="stock.intradayReasons && stock.intradayReasons.length > 0" class="text-[10px] text-gray-400 truncate">
                <span class="text-rose-400">⚠️</span> {{ stock.intradayReasons[0] }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Modal Dialog -->
      <app-stock-modal [(visible)]="modalVisible" [stock]="selectedStock"></app-stock-modal>
    </div>
  `
})
export class DashboardComponent {
  public apiService = inject(StockApiService);
  public modalVisible = false;
  public selectedStock: StockAnalysisResult | null = null;

  selectStock(stock: StockAnalysisResult) {
    this.selectedStock = stock;
    this.modalVisible = true;
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
