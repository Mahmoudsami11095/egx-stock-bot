import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockApiService } from '../../core/services/stock-api.service';

@Component({
  selector: 'app-gold-tracker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-8 pb-12">
      <!-- Page Header -->
      <div class="space-y-1">
        <h2 class="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          ⚜️ أسعار الذهب اللحظية في مصر وعالمياً (Live Gold Tracker)
        </h2>
        <p class="text-xs sm:text-sm text-gray-400">أسعار الذهب المباشرة بالجنيه المصري (بدون مصنعية) ومحسوبة حسب سعر صرف الدولار البنكي</p>
      </div>

      <!-- Live Gold Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 24K Gold -->
        <div class="glass-card p-6 rounded-2xl border-l-4 border-l-amber-400 space-y-3">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold">
            <span>الذهب عيار 24</span>
            <span class="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">نقي 99.9%</span>
          </div>
          <div class="text-3xl font-black text-white">{{ apiService.goldPrices()?.gold24kEgp }} <small class="text-sm font-normal text-gray-400">ج.م/جرام</small></div>
          <p class="text-xs text-gray-400">أعلى نقاء، مستخدم في السبايك الذهبية</p>
        </div>

        <!-- 21K Gold (Main benchmark in Egypt) -->
        <div class="glass-card p-6 rounded-2xl border-l-4 border-l-amber-500 space-y-3 relative overflow-hidden">
          <div class="absolute -right-8 -bottom-8 w-24 h-24 bg-amber-500/10 rounded-full blur-xl"></div>
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold">
            <span>الذهب عيار 21 (الأكثر تداولاً)</span>
            <span class="text-amber-500 bg-amber-500/20 px-2 py-0.5 rounded-full font-extrabold">⭐ الأساسي في مصر</span>
          </div>
          <div class="text-3xl font-black text-amber-400">{{ apiService.goldPrices()?.gold21kEgp }} <small class="text-sm font-normal text-gray-400">ج.م/جرام</small></div>
          <p class="text-xs text-gray-400">المعيار الرئيسي لتسعير المشغولات والجنيهات</p>
        </div>

        <!-- 18K Gold -->
        <div class="glass-card p-6 rounded-2xl border-l-4 border-l-amber-600 space-y-3">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold">
            <span>الذهب عيار 18</span>
            <span class="text-amber-600 bg-amber-600/10 px-2 py-0.5 rounded-full">مشغولات</span>
          </div>
          <div class="text-3xl font-black text-white">{{ apiService.goldPrices()?.gold18kEgp }} <small class="text-sm font-normal text-gray-400">ج.م/جرام</small></div>
          <p class="text-xs text-gray-400">المشغولات الذهبية الحديثة والسلاسل</p>
        </div>

        <!-- Sovereign Gold Coin (8g 21K) -->
        <div class="glass-card p-6 rounded-2xl border-l-4 border-l-emeraldAccent space-y-3">
          <div class="flex items-center justify-between text-gray-400 text-xs font-bold">
            <span>الجنيه الذهب (8 جرام 21K)</span>
            <span class="text-emeraldAccent bg-emeraldAccent/10 px-2 py-0.5 rounded-full">ادخار</span>
          </div>
          <div class="text-3xl font-black text-emeraldAccent">{{ apiService.goldPrices()?.goldCoinEgp }} <small class="text-sm font-normal text-gray-400">ج.م</small></div>
          <p class="text-xs text-gray-400">وزن 8 جرامات من الذهب عيار 21</p>
        </div>
      </div>

      <!-- Macro & Forex Details -->
      <div class="glass-card p-6 rounded-2xl border border-darkBorder grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-2">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i class="pi pi-globe text-cyanAccent"></i> الأوقية العالمية (XAU/USD)
          </h3>
          <div class="text-2xl font-black text-cyanAccent">&#36;{{ apiService.goldPrices()?.goldUsdPerOz }} <small class="text-xs text-gray-400 font-normal">دولار / أونصة</small></div>
          <p class="text-xs text-gray-400">السعر العالمي المباشر لـ 31.1035 جرام من الذهب النقي عيار 24 في البورصات العالمية.</p>
        </div>

        <div class="space-y-2">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i class="pi pi-dollar text-emeraldAccent"></i> سعر صرف الدولار (USD/EGP)
          </h3>
          <div class="text-2xl font-black text-white">{{ apiService.goldPrices()?.usdEgpRate }} <small class="text-xs text-gray-400 font-normal">جنيه لكل دولار</small></div>
          <p class="text-xs text-gray-400">سعر الصرف البنكي اللحظي المستخدم في معادلة احتساب أسعار الذهب محلياً.</p>
        </div>
      </div>
    </div>
  `
})
export class GoldTrackerComponent {
  public apiService = inject(StockApiService);
}
