import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StockApiService } from '../../core/services/stock-api.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="sticky top-0 z-50 glass-nav">
      <!-- Top Market Ticker Bar -->
      <div class="bg-darkCard/80 border-b border-darkBorder/60 text-xs py-1.5 px-4">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-4">
            <span class="inline-flex items-center gap-1.5 font-bold text-emeraldAccent bg-emeraldAccent/10 px-2 py-0.5 rounded-full border border-emeraldAccent/20">
              <span class="w-2 h-2 rounded-full bg-emeraldAccent animate-pulse"></span>
              مؤشر EGX30 العام: سوق صاعد (Bullish)
            </span>
            <span class="text-gray-400">
              💱 الدولار/جنيه: <strong class="text-white">{{ apiService.usdEgp() }} ج.م</strong>
            </span>
            <span class="text-gray-400 hidden md:inline">
              ⚜️ الذهب عيار 24: <strong class="text-amberAccent">{{ apiService.goldPrices()?.gold24kEgp }} ج.م</strong>
            </span>
          </div>

          <div class="flex items-center gap-3 text-gray-400">
            <span>تحديث مباشر: <strong class="text-gray-200">{{ apiService.lastUpdated() | date:'shortTime' }}</strong></span>
            <button (click)="apiService.loadMarketData()" class="hover:text-emeraldAccent transition-colors">
              <i class="pi pi-refresh" [class.animate-spin]="apiService.loading()"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Navigation Header -->
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <!-- Brand Logo & Title -->
        <a routerLink="/" class="flex items-center gap-3 group">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emeraldAccent to-cyanAccent p-0.5 shadow-lg shadow-emeraldAccent/20">
            <div class="w-full h-full bg-darkBg rounded-[10px] flex items-center justify-center font-black text-emeraldAccent text-xl group-hover:scale-95 transition-transform">
              🕌
            </div>
          </div>
          <div>
            <h1 class="text-lg font-black tracking-tight text-white flex items-center gap-2">
              EGX Halal Stocks <span class="text-xs bg-emeraldAccent/20 text-emeraldAccent font-bold px-2 py-0.5 rounded-md border border-emeraldAccent/30">Live Intelligence</span>
            </h1>
            <p class="text-xs text-gray-400">منصة تحليل أسهم البورصة المصرية والقيم العادلة المتوافقة مع الشريعة</p>
          </div>
        </a>

        <!-- Navigation Links -->
        <nav class="hidden md:flex items-center gap-1 bg-darkCard/60 p-1 rounded-xl border border-darkBorder/60">
          <a routerLink="/" routerLinkActive="bg-emeraldAccent text-black font-bold" [routerLinkActiveOptions]="{exact: true}"
             class="px-4 py-2 text-sm rounded-lg transition-all text-gray-300 hover:text-white">
            📊 نظرة عامة
          </a>
          <a routerLink="/screener" routerLinkActive="bg-emeraldAccent text-black font-bold"
             class="px-4 py-2 text-sm rounded-lg transition-all text-gray-300 hover:text-white">
            📈 أسهم البورصة الحلال
          </a>
          <a routerLink="/gold" routerLinkActive="bg-emeraldAccent text-black font-bold"
             class="px-4 py-2 text-sm rounded-lg transition-all text-gray-300 hover:text-white">
            ⚜️ أسعار الذهب
          </a>
        </nav>

        <!-- External Sheet Links -->
        <div class="flex items-center gap-2">
          <a href="https://docs.google.com/spreadsheets/d/17anSf-cjckoBaV3jhBD5IscwxONGKu79W3ekTSq8lck/edit?gid=0#gid=0"
             target="_blank" rel="noopener"
             class="hidden sm:inline-flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emeraldAccent border border-emeraldAccent/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm">
            <i class="pi pi-file-excel text-sm"></i>
            شيت Google Sheets أونلاين
          </a>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  public apiService = inject(StockApiService);
}
