import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StockApiService } from '../../core/services/stock-api.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
            <!-- Data Source Switcher -->
            <div class="flex items-center gap-1.5 bg-darkBg/90 px-2 py-1 rounded-lg border border-darkBorder text-[11px]">
              <span class="text-gray-400 font-medium">مصدر البيانات:</span>
              <select [ngModel]="apiService.selectedSource()" 
                      (ngModelChange)="apiService.setDataSource($event)"
                      class="bg-transparent text-emeraldAccent font-bold focus:outline-none cursor-pointer">
                <option value="tradingview" class="bg-darkCard text-white">🌐 TradingView</option>
                <option value="mubasher" class="bg-darkCard text-white">📊 مباشر مصر (Mubasher)</option>
                <option value="eodhd" class="bg-darkCard text-white">📡 EODHD API (Live)</option>
                <option value="investing" class="bg-darkCard text-white">📈 Investing.com</option>
                <option value="yahoo" class="bg-darkCard text-white">💹 Yahoo Finance</option>
              </select>
            </div>

            <span class="inline-flex items-center gap-1">تحديث: <strong dir="ltr" class="inline-block text-gray-200">{{ apiService.lastUpdated() | date:'shortTime' }}</strong></span>
            <button (click)="apiService.loadMarketData(true, false)" title="تحديث سريع لحظي (Fast Refresh)" class="hover:text-emeraldAccent transition-colors cursor-pointer">
              <i class="pi pi-refresh" [class.animate-spin]="apiService.loading() && !apiService.isDeepScanning()"></i>
            </button>
            <button (click)="apiService.loadDeepMarketData()" title="فحص عميق للأخبار والنتائج المالية المعلنة (Deep News Scan)" class="hover:text-amber-300 transition-colors flex items-center gap-1 text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/30 cursor-pointer">
              <i [class]="apiService.isDeepScanning() ? 'pi pi-spin pi-spinner text-amber-400' : 'pi pi-search text-amber-400'"></i>
              <span class="hidden sm:inline">فحص الأخبار</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Navigation Header -->
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <!-- Brand Logo & Title -->
        <a routerLink="/" class="flex items-center gap-3 group">
          <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-emeraldAccent via-cyan-400 to-amber-400 p-0.5 shadow-lg shadow-emeraldAccent/20 group-hover:scale-105 transition-transform">
            <div class="w-full h-full bg-darkBg rounded-[10px] flex items-center justify-center p-1.5 overflow-hidden">
              <svg viewBox="0 0 512 512" class="w-full h-full">
                <defs>
                  <linearGradient id="hdrEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#10b981"/>
                    <stop offset="50%" stop-color="#34d399"/>
                    <stop offset="100%" stop-color="#059669"/>
                  </linearGradient>
                  <linearGradient id="hdrGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#fbdf7e"/>
                    <stop offset="100%" stop-color="#f59e0b"/>
                  </linearGradient>
                </defs>
                <rect width="512" height="512" rx="128" fill="#090d16"/>
                <line x1="120" y1="360" x2="120" y2="280" stroke="#059669" stroke-width="8" opacity="0.7"/>
                <rect x="108" y="300" width="24" height="40" rx="4" fill="#059669" opacity="0.8"/>
                <line x1="200" y1="380" x2="200" y2="240" stroke="#10b981" stroke-width="8"/>
                <rect x="188" y="270" width="24" height="70" rx="4" fill="#10b981"/>
                <line x1="280" y1="320" x2="280" y2="180" stroke="#34d399" stroke-width="8"/>
                <rect x="268" y="210" width="24" height="80" rx="4" fill="#34d399"/>
                <line x1="360" y1="260" x2="360" y2="110" stroke="url(#hdrGoldGrad)" stroke-width="8"/>
                <rect x="348" y="140" width="24" height="90" rx="4" fill="url(#hdrGoldGrad)"/>
                <path d="M 90 320 Q 180 300 240 220 T 420 100" fill="none" stroke="url(#hdrEmeraldGrad)" stroke-width="22" stroke-linecap="round"/>
                <path d="M 370 100 L 430 95 L 425 155 Z" fill="url(#hdrEmeraldGrad)"/>
              </svg>
            </div>
          </div>
          <div>
            <h1 class="text-lg font-black tracking-tight text-white flex items-center gap-2">
              EGX Stock Analytics <span class="text-xs bg-emeraldAccent/20 text-emeraldAccent font-bold px-2 py-0.5 rounded-md border border-emeraldAccent/30">Fair Value Screener</span>
            </h1>
            <p class="text-xs text-gray-400">منصة التحليل المالي وحساب القيم العادلة لأسهم البورصة المصرية</p>
          </div>
        </a>

        <!-- Navigation Links (Desktop/Tablet) -->
        <nav class="hidden lg:flex items-center gap-1 bg-darkCard/60 p-1 rounded-xl border border-darkBorder/60">
          <a routerLink="/" routerLinkActive="bg-emeraldAccent text-black font-bold" [routerLinkActiveOptions]="{exact: true}"
             class="px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all text-gray-300 hover:text-white">
            📊 نظرة عامة
          </a>
          <a routerLink="/screener" routerLinkActive="bg-emeraldAccent text-black font-bold"
             class="px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all text-gray-300 hover:text-white">
            📈 أسهم البورصة الحلال
          </a>
          <a routerLink="/intraday" routerLinkActive="bg-orange-500 text-black font-bold"
             class="px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all text-gray-300 hover:text-white">
            ⚡ المضاربة اليومية
          </a>
          <a routerLink="/strategies" routerLinkActive="bg-blue-500 text-white font-bold"
             class="px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all text-gray-300 hover:text-white">
            💼 خطط واستراتيجيات
          </a>
          <a routerLink="/gold" routerLinkActive="bg-emeraldAccent text-black font-bold"
             class="px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all text-gray-300 hover:text-white">
            ⚜️ أسعار الذهب
          </a>
          <a routerLink="/fair-value-compare" routerLinkActive="bg-purple-600 text-white font-bold"
             class="px-2.5 py-1.5 text-xs sm:text-sm rounded-lg transition-all text-gray-300 hover:text-white whitespace-nowrap">
            ⚖️ مقارنة القيم العادلة
          </a>
          <a routerLink="/price-compare" routerLinkActive="bg-teal-600 text-white font-bold"
             class="px-2.5 py-1.5 text-xs sm:text-sm rounded-lg transition-all text-gray-300 hover:text-white whitespace-nowrap">
            🏷️ مقارنة الأسعار اللحظية
          </a>
          <a routerLink="/sector-rotation" routerLinkActive="bg-amber-600 text-white font-bold"
             class="px-2.5 py-1.5 text-xs sm:text-sm rounded-lg transition-all text-gray-300 hover:text-white whitespace-nowrap">
            🔄 تدوير السيولة
          </a>
        </nav>

        <!-- Right Side Actions & Mobile Hamburger -->
        <div class="flex items-center gap-2">
          <a href="https://docs.google.com/spreadsheets/d/17anSf-cjckoBaV3jhBD5IscwxONGKu79W3ekTSq8lck/edit?gid=0#gid=0"
             target="_blank" rel="noopener"
             class="hidden sm:inline-flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emeraldAccent border border-emeraldAccent/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm">
            <i class="pi pi-file-excel text-xs"></i>
            شيت Google
          </a>

          <!-- Mobile Menu Toggle Button -->
          <button (click)="mobileMenuOpen = !mobileMenuOpen"
                  class="lg:hidden p-2 rounded-xl bg-darkCard border border-darkBorder text-gray-300 hover:text-white cursor-pointer"
                  aria-label="Toggle navigation">
            <i [class]="mobileMenuOpen ? 'pi pi-times text-lg' : 'pi pi-bars text-lg'"></i>
          </button>
        </div>
      </div>

      <!-- Mobile Navigation Drawer / Dropdown -->
      <div *ngIf="mobileMenuOpen" class="lg:hidden bg-darkBg/95 border-b border-darkBorder px-4 py-3 space-y-1 backdrop-blur-lg">
        <a routerLink="/" (click)="mobileMenuOpen = false" routerLinkActive="bg-emeraldAccent text-black font-bold" [routerLinkActiveOptions]="{exact: true}"
           class="block px-3 py-2 text-sm rounded-lg transition-all text-gray-300 hover:bg-darkCard">
          📊 نظرة عامة
        </a>
        <a routerLink="/screener" (click)="mobileMenuOpen = false" routerLinkActive="bg-emeraldAccent text-black font-bold"
           class="block px-3 py-2 text-sm rounded-lg transition-all text-gray-300 hover:bg-darkCard">
          📈 أسهم البورصة الحلال
        </a>
        <a routerLink="/intraday" (click)="mobileMenuOpen = false" routerLinkActive="bg-orange-500 text-black font-bold"
           class="block px-3 py-2 text-sm rounded-lg transition-all text-gray-300 hover:bg-darkCard">
          ⚡ المضاربة اليومية
        </a>
        <a routerLink="/strategies" (click)="mobileMenuOpen = false" routerLinkActive="bg-blue-500 text-white font-bold"
           class="block px-3 py-2 text-sm rounded-lg transition-all text-gray-300 hover:bg-darkCard">
          💼 خطط واستراتيجيات
        </a>
        <a routerLink="/gold" (click)="mobileMenuOpen = false" routerLinkActive="bg-emeraldAccent text-black font-bold"
           class="block px-3 py-2 text-sm rounded-lg transition-all text-gray-300 hover:bg-darkCard">
          ⚜️ أسعار الذهب
        </a>
        <a routerLink="/fair-value-compare" (click)="mobileMenuOpen = false" routerLinkActive="bg-purple-600 text-white font-bold"
           class="block px-3 py-2 text-sm rounded-lg transition-all text-gray-300 hover:bg-darkCard">
          ⚖️ مقارنة القيم العادلة
        </a>
        <a routerLink="/price-compare" (click)="mobileMenuOpen = false" routerLinkActive="bg-teal-600 text-white font-bold"
           class="block px-3 py-2 text-sm rounded-lg transition-all text-gray-300 hover:bg-darkCard">
          🏷️ مقارنة الأسعار اللحظية
        </a>
        <a routerLink="/sector-rotation" (click)="mobileMenuOpen = false" routerLinkActive="bg-amber-600 text-white font-bold"
           class="block px-3 py-2 text-sm rounded-lg transition-all text-gray-300 hover:bg-darkCard">
          🔄 تدوير السيولة
        </a>
      </div>
    </header>
  `
})
export class HeaderComponent {
  public apiService = inject(StockApiService);
  public mobileMenuOpen = false;
}
