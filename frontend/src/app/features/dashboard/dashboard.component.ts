import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StockApiService } from '../../core/services/stock-api.service';
import { StockModalComponent } from '../../shared/components/stock-modal/stock-modal.component';
import { StockAnalysisResult } from '../../core/models/stock.model';

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
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emeraldAccent/10 border border-emeraldAccent/30 text-emeraldAccent text-xs font-bold">
            <span class="w-2 h-2 rounded-full bg-emeraldAccent animate-pulse"></span>
            تحديث تلقائي مباشر للمشروبات والأسهم وقيمها العادلة
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
              تصفح الـ 108 سهم حلال
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
            <span>الذهب عيار 21</span>
            <i class="pi pi-sun text-amberAccent text-lg"></i>
          </div>
          <div class="text-2xl font-black text-amberAccent">{{ apiService.goldPrices()?.gold21kEgp }} ج.م</div>
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
}
