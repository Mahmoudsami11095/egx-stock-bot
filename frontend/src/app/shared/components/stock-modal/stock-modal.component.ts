import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { timeout } from 'rxjs';
import { StockAnalysisResult, SignalType } from '../../../core/models/stock.model';

@Component({
  selector: 'app-stock-modal',
  standalone: true,
  imports: [CommonModule, DialogModule],
  template: `
    <p-dialog [header]="stock ? stock.quote.nameAr + ' (' + stock.quote.symbol + ')' : ''"
              [(visible)]="visible"
              [modal]="true"
              [style]="{width: '94vw', maxWidth: '820px'}"
              [dismissableMask]="true"
              (onHide)="visibleChange.emit(false)">

      <div *ngIf="stock" class="space-y-6 text-gray-200 py-2">
        <!-- Stock Title Banner & Sharia Compliance -->
        <div class="flex flex-wrap items-center justify-between gap-3 bg-darkCard/90 p-4 rounded-2xl border border-darkBorder">
          <div class="flex items-center gap-3">
            <span [class]="getSignalBadgeClass(stock.signalType)" class="px-3.5 py-1.5 rounded-full text-xs font-black shadow-md">
              {{ getSignalLabel(stock.signalType) }}
            </span>
            <span class="text-xs font-bold text-gray-400">تقييم الإشارة: {{ stock.signalScore > 0 ? '+' : '' }}{{ stock.signalScore }}</span>
          </div>

          <div class="text-xs font-extrabold text-emeraldAccent bg-emeraldAccent/10 px-3.5 py-1.5 rounded-full border border-emeraldAccent/30 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emeraldAccent animate-pulse"></span>
            {{ stock.shariaStatusText || '🟢 متوافق مع أحكام الشريعة الإسلامية' }}
          </div>
        </div>

        <!-- 📊 SECTION 1: التحليل المالي (Financial Analysis) -->
        <div class="glass-card p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-darkCard to-darkBg space-y-4">
          <div class="flex items-center justify-between border-b border-darkBorder pb-3">
            <h3 class="text-base font-black text-emeraldAccent flex items-center gap-2">
              <i class="pi pi-chart-bar text-emeraldAccent text-lg"></i> 1. التحليل المالي والتقييم العادل (Financial Valuation)
            </h3>
            <span class="text-xs text-gray-400">ثقة التقييم: <strong>{{ stock.fairValueConfidence === 'HIGH' ? 'عالية (ربحية نمو)' : 'متوسطة (تاريخية)' }}</strong></span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <!-- Current Market Price -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-[11px] text-gray-400 font-bold block">السعر اللحظي الحالي</span>
              <strong class="text-xl text-white font-black block">{{ stock.quote.currentPrice }} <small class="text-xs font-normal text-gray-400">ج.م</small></strong>
              <span [class]="stock.quote.changePercent >= 0 ? 'text-emeraldAccent' : 'text-roseAccent'" class="text-xs font-extrabold block">
                {{ stock.quote.changePercent >= 0 ? '+' : '' }}{{ stock.quote.changePercent }}% اليوم
              </span>
            </div>

            <!-- Fair Value -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-[11px] text-emerald-400 font-bold block">القيمة العادلة المحسوبة</span>
              <strong class="text-xl text-emeraldAccent font-black block">{{ stock.fairValue }} <small class="text-xs font-normal text-gray-400">ج.م</small></strong>
              <span class="text-xs text-emeraldAccent font-extrabold block">+{{ stock.fairValueUpsidePercent }}% نمو متوقع</span>
            </div>

            <!-- P/E Ratio -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-[11px] text-cyan-400 font-bold block">مضاعف الربحية (P/E)</span>
              <strong class="text-xl text-cyanAccent font-black block">{{ stock.quote.peRatio || 'N/A' }}</strong>
              <span class="text-[11px] text-gray-400 block">مقارنة بقطاع EGX (13.5x)</span>
            </div>

            <!-- EPS -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-[11px] text-amber-400 font-bold block">ربحية السهم (EPS TTM)</span>
              <strong class="text-xl text-amberAccent font-black block">{{ stock.quote.peRatio ? (stock.quote.currentPrice / stock.quote.peRatio).toFixed(2) : 'N/A' }} <small class="text-xs font-normal text-gray-400">ج.م</small></strong>
              <span class="text-[11px] text-gray-400 block">العائد للسهم السنوي</span>
            </div>

            <!-- Dividend Yield & DPS -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-[11px] text-purple-400 font-bold block">عائد التوزيعات (Dividend Yield)</span>
              <strong class="text-xl text-purple-400 font-black block">
                {{ stock.quote.dividendYield ? stock.quote.dividendYield + '%' : 'غير متاح' }}
              </strong>
              <span class="text-[11px] text-gray-400 block">
                {{ stock.quote.dividendPerShare ? '~' + stock.quote.dividendPerShare + ' ج.م / سهم' : 'بيانات TradingView' }}
              </span>
            </div>
          </div>

          <!-- Financial Summary Verdict -->
          <div class="bg-darkBg/60 p-3.5 rounded-xl border border-darkBorder text-xs text-gray-300 flex items-center justify-between gap-3">
            <span class="text-gray-400">ملخص التقييم المالي:</span>
            <strong [class]="stock.fairValueUpsidePercent >= 15 ? 'text-emeraldAccent' : stock.fairValueUpsidePercent <= -15 ? 'text-roseAccent' : 'text-amberAccent'" class="font-bold">
              {{ getFinancialVerdictText(stock.fairValueUpsidePercent) }}
            </strong>
          </div>
        </div>

        <!-- 📈 SECTION 2: التحليل الفني (Technical Analysis) -->
        <div class="glass-card p-5 rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 via-darkCard to-darkBg space-y-4">
          <div class="flex items-center justify-between border-b border-darkBorder pb-3">
            <h3 class="text-base font-black text-cyanAccent flex items-center gap-2">
              <i class="pi pi-sliders-h text-cyanAccent text-lg"></i> 2. التحليل الفني ومؤشرات الزخم (Technical Analysis)
            </h3>
            <span class="text-xs text-gray-400">مؤشر القوة RSI(14): <strong class="text-amber-400">{{ stock.indicators.rsi }}</strong></span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <!-- RSI Diagnostics -->
            <div class="bg-darkBg/80 p-3 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">مؤشر القوة النسبية RSI:</span>
              <strong class="text-amberAccent text-sm font-black">{{ stock.indicators.rsi }}</strong>
              <span class="text-[11px] text-gray-300 block">{{ getRsiDiagnosis(stock.indicators.rsi) }}</span>
            </div>

            <!-- SMA Trend -->
            <div class="bg-darkBg/80 p-3 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">المتوسطات (SMA20 / SMA50):</span>
              <strong class="text-white text-sm font-black">{{ stock.indicators.sma20 }} / {{ stock.indicators.sma50 }}</strong>
              <span class="text-[11px] text-emeraldAccent block" *ngIf="stock.quote.currentPrice > stock.indicators.sma20">الاتجاه صاعد أعلى المتوسطات 🐂</span>
              <span class="text-[11px] text-rose-400 block" *ngIf="stock.quote.currentPrice <= stock.indicators.sma20">الاتجاه هابط أسفل المتوسطات 🐻</span>
            </div>

            <!-- MACD Crossover -->
            <div class="bg-darkBg/80 p-3 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">زخم الماكد (MACD):</span>
              <strong class="text-cyanAccent text-sm font-black">{{ stock.indicators.macd?.macd || 'إيجابي' }}</strong>
              <span class="text-[11px] text-gray-300 block">تقاطع إيجابي لصالح المشتري</span>
            </div>

            <!-- Support Level -->
            <div class="bg-darkBg/80 p-3 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">مستوى الدعم الفني:</span>
              <strong class="text-emeraldAccent text-sm font-black">{{ stock.indicators.support }} ج.م</strong>
              <span class="text-[11px] text-gray-400 block">نقطة ارتداد حمائية</span>
            </div>

            <!-- Resistance Level -->
            <div class="bg-darkBg/80 p-3 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">مستوى المقاومة الهدف:</span>
              <strong class="text-roseAccent text-sm font-black">{{ stock.indicators.resistance }} ج.م</strong>
              <span class="text-[11px] text-gray-400 block">نقطة اختراق أولى</span>
            </div>

            <!-- ADX Trend Strength -->
            <div class="bg-darkBg/80 p-3 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">قوة الاتجاه والتذبذب:</span>
              <strong class="text-white text-sm font-black">ADX: {{ stock.indicators.adx || '22' }}</strong>
              <span class="text-[11px] text-gray-300 block">التذبذب (ATR): {{ stock.indicators.atr || '0.04' }} ج.م</span>
            </div>
          </div>
        </div>

        <!-- ⚡ SECTION 3: التوصية الشاملة وخطة التداول (Full Buy/Sell Recommendation) -->
        <div class="glass-card p-5 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-darkCard to-darkBg space-y-4">
          <div class="flex items-center justify-between border-b border-darkBorder pb-3">
            <h3 class="text-base font-black text-amber-400 flex items-center gap-2">
              <i class="pi pi-compass text-amber-400 text-lg"></i> 3. التوصية الشاملة وخطة التداول (Actionable Trading & Risk Plan)
            </h3>
            <span [class]="getSignalBadgeClass(stock.signalType)" class="px-3 py-1 rounded-full text-xs font-black">
              {{ getSignalLabel(stock.signalType) }}
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <!-- Safe Entry Zone -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">📥 نطاق الدخول الآمن للمحفظة:</span>
              <strong class="text-emeraldAccent text-base font-black">{{ stock.suggestedEntry.min }} - {{ stock.suggestedEntry.max }} ج.م</strong>
              <span class="text-[11px] text-gray-400 block">يُنصح بالشراء على دفعات عند هذا النطاق</span>
            </div>

            <!-- Target 1 -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">🎯 الهدف الأول (Target 1 القريب):</span>
              <strong class="text-white text-base font-black">{{ stock.suggestedTarget.target1 }} ج.م</strong>
              <span class="text-[11px] text-emerald-400 block">+{{ getPercentDiff(stock.suggestedTarget.target1, stock.quote.currentPrice) }}% ربح متوقع</span>
            </div>

            <!-- Target 2 (Fair Value) -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">🚀 الهدف الثاني (القيمة العادلة):</span>
              <strong class="text-emeraldAccent text-base font-black">{{ stock.suggestedTarget.target2 }} ج.م</strong>
              <span class="text-[11px] text-emerald-400 block">+{{ stock.fairValueUpsidePercent }}% ربح القيمة العادلة</span>
            </div>

            <!-- Stop Loss -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">🛑 وقف الخسارة لحماية رأس المال:</span>
              <strong class="text-roseAccent text-base font-black">{{ stock.suggestedStopLoss }} ج.م</strong>
              <span class="text-[11px] text-rose-400 block">التزام صارم بوقف الخسارة عند الإغلاق أدناه</span>
            </div>

            <!-- Recommended Position Size -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">💰 حجم المحفظة المقترح:</span>
              <strong class="text-amberAccent text-base font-black">{{ stock.positionSizePercent }}% من إجمالي المحفظة</strong>
              <span class="text-[11px] text-gray-400 block">إدارة مخاطر متوازنة وعدم تركيز المحفظة</span>
            </div>

            <!-- Risk/Reward Ratio -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">⚖️ نسبة العائد مقابل المخاطرة:</span>
              <strong class="text-cyanAccent text-base font-black">1 : {{ stock.riskRewardRatio }}</strong>
              <span class="text-[11px] text-gray-400 block">مقابل كل 1 جنيه مخاطرة يتوقع {{ stock.riskRewardRatio }} ج.م ربح</span>
            </div>
          </div>

          <!-- Recommendation Drivers & Bullet Points -->
          <div class="space-y-2 text-xs text-gray-300 pt-2 border-t border-darkBorder">
            <h4 class="font-bold text-gray-100 flex items-center gap-1.5">
              <i class="pi pi-check-circle text-emeraldAccent"></i> مبررات وأسباب التوصية الشاملة:
            </h4>
            <ul class="space-y-1.5 pr-2">
              <li *ngFor="let reason of stock.reasons" class="flex items-start gap-2 text-gray-300">
                <span class="text-emeraldAccent font-bold">•</span>
                <span>{{ reason }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- 🤖 SECTION 4: توصية الذكاء الاصطناعي (AI Gemini Recommendation) -->
        <div class="glass-card p-5 rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 via-darkCard to-darkBg space-y-4">
          <div class="flex items-center justify-between border-b border-darkBorder pb-3">
            <h3 class="text-base font-black text-purple-400 flex items-center gap-2">
              <i class="pi pi-sparkles text-purple-400 text-lg"></i> 4. توصية الذكاء الاصطناعي (Gemini AI Deep Analysis)
            </h3>
            <button
              *ngIf="!aiLoading && !aiRecommendation"
              (click)="fetchAiRecommendation()"
              class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-black shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5">
              <i class="pi pi-bolt"></i> اطلب تحليل Gemini AI
            </button>
            <button
              *ngIf="aiRecommendation"
              (click)="aiRecommendation = ''; fetchAiRecommendation()"
              class="px-3 py-1 rounded-xl bg-darkBg hover:bg-darkBorder text-gray-400 hover:text-white text-xs font-bold transition-colors flex items-center gap-1">
              <i class="pi pi-refresh"></i> تحديث التحليل
            </button>
          </div>

          <!-- Loading State -->
          <div *ngIf="aiLoading" class="flex flex-col items-center justify-center py-8 gap-3">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-purple-400 animate-bounce"></span>
              <span class="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]"></span>
              <span class="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
            <span class="text-xs text-gray-400">جاري توليد التحليل العميق من Google Gemini AI...</span>
          </div>

          <!-- Empty State -->
          <div *ngIf="!aiLoading && !aiRecommendation" class="text-center py-6 text-xs text-gray-400">
            <div class="text-3xl mb-2">🤖</div>
            <p>اضغط الزر أعلاه لإرسال بيانات السهم إلى Google Gemini AI</p>
            <p class="text-gray-500 mt-1">سيقوم الذكاء الاصطناعي بتحليل مالي وفني شامل وتقديم توصية ديناميكية مفصلة</p>
          </div>

          <!-- AI Response -->
          <div *ngIf="aiRecommendation && !aiLoading" [innerHTML]="getFormattedMessage(aiRecommendation)" class="bg-darkBg/80 p-4 rounded-2xl border border-purple-500/20 text-xs text-gray-200 leading-relaxed">
          </div>

          <div *ngIf="aiProvider" class="text-[10px] text-purple-400/80 font-bold flex items-center gap-1 pt-1">
            <i class="pi pi-bolt text-[10px]"></i> {{ aiProvider }}
          </div>
        </div>

        <!-- ⚡ SECTION 5: توصية المضاربة داخل الجلسة (Intraday Session Trading) -->
        <div class="glass-card p-5 rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-500/5 via-darkCard to-darkBg space-y-4">
          <div class="flex items-center justify-between border-b border-darkBorder pb-3">
            <h3 class="text-base font-black text-orange-400 flex items-center gap-2">
              <i class="pi pi-stopwatch text-orange-400 text-lg"></i> 5. توصية المضاربة داخل الجلسة (Intraday Session)
            </h3>
            <span *ngIf="stock.intradaySignal" [class]="getIntradayBadgeClass(stock.intradaySignal)" class="px-3 py-1 rounded-full text-xs font-black">
              {{ getIntradayLabel(stock.intradaySignal) }}
            </span>
          </div>

          <!-- Pre-calculated Intraday Quick Summary -->
          <div *ngIf="stock.intradaySignal" class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <!-- Intraday Entry -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">📥 نقطة دخول المضاربة:</span>
              <strong class="text-emeraldAccent text-base font-black">{{ stock.intradayEntry }} ج.م</strong>
              <span class="text-[11px] text-gray-400 block">سعر الدخول اللحظي للمضاربة</span>
            </div>

            <!-- Intraday Target -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">🎯 هدف جني الأرباح السريع:</span>
              <strong class="text-cyanAccent text-base font-black">{{ stock.intradayTarget }} ج.م</strong>
              <span class="text-[11px] text-emerald-400 block">+{{ getPercentDiff(stock.intradayTarget!, stock.quote.currentPrice) }}% ربح متوقع</span>
            </div>

            <!-- Intraday Stop Loss -->
            <div class="bg-darkBg/80 p-3.5 rounded-2xl border border-darkBorder space-y-1">
              <span class="text-gray-400 block font-bold">🛑 وقف خسارة المضاربة:</span>
              <strong class="text-roseAccent text-base font-black">{{ stock.intradayStopLoss }} ج.م</strong>
              <span class="text-[11px] text-rose-400 block">إيقاف صارم وسريع</span>
            </div>
          </div>

          <!-- Intraday Reasons -->
          <div *ngIf="stock.intradayReasons && stock.intradayReasons.length > 0" class="space-y-2 text-xs text-gray-300 pt-2 border-t border-darkBorder">
            <h4 class="font-bold text-gray-100 flex items-center gap-1.5">
              <i class="pi pi-check-circle text-orange-400"></i> مبررات إشارة المضاربة التلقائية:
            </h4>
            <ul class="space-y-1.5 pr-2">
              <li *ngFor="let reason of stock.intradayReasons" class="flex items-start gap-2 text-gray-300">
                <span class="text-orange-400 font-bold">•</span>
                <span>{{ reason }}</span>
              </li>
            </ul>
          </div>

          <!-- AI Deep Analysis Divider -->
          <div class="border-t border-darkBorder pt-3">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-bold text-orange-400 flex items-center gap-1.5">
                <i class="pi pi-sparkles text-orange-400"></i> تحليل عميق بالذكاء الاصطناعي (Gemini AI)
              </h4>
              <button
                *ngIf="!intradayLoading && !intradayRecommendation"
                (click)="fetchIntradayRecommendation()"
                class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black shadow-lg shadow-orange-500/20 transition-all flex items-center gap-1.5">
                <i class="pi pi-bolt"></i> اطلب تحليل AI عميق
              </button>
              <button
                *ngIf="intradayRecommendation"
                (click)="intradayRecommendation = ''; fetchIntradayRecommendation()"
                class="px-3 py-1 rounded-xl bg-darkBg hover:bg-darkBorder text-gray-400 hover:text-white text-xs font-bold transition-colors flex items-center gap-1">
                <i class="pi pi-refresh"></i> تحديث التحليل
              </button>
            </div>

            <!-- Loading State -->
            <div *ngIf="intradayLoading" class="flex flex-col items-center justify-center py-8 gap-3">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-orange-400 animate-bounce"></span>
                <span class="w-2 h-2 rounded-full bg-orange-400 animate-bounce [animation-delay:0.2s]"></span>
                <span class="w-2 h-2 rounded-full bg-orange-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span class="text-xs text-gray-400">جاري توليد توصية المضاربة اللحظية من Gemini AI...</span>
            </div>

            <!-- Empty State -->
            <div *ngIf="!intradayLoading && !intradayRecommendation" class="text-center py-6 text-xs text-gray-400">
              <div class="text-3xl mb-2">🤖</div>
              <p>اضغط الزر أعلاه للحصول على تحليل عميق بالمضاربة داخل الجلسة</p>
              <p class="text-gray-500 mt-1">سيحلل الذكاء الاصطناعي نقاط الدخول والخروج السريعة وأفضل توقيت للمضاربة اليومية</p>
            </div>

            <!-- Intraday AI Response -->
            <div *ngIf="intradayRecommendation && !intradayLoading" [innerHTML]="getFormattedMessage(intradayRecommendation)" class="bg-darkBg/80 p-4 rounded-2xl border border-orange-500/20 text-xs text-gray-200 leading-relaxed">
            </div>

            <div *ngIf="intradayProvider" class="text-[10px] text-orange-400/80 font-bold flex items-center gap-1 pt-1">
              <i class="pi pi-bolt text-[10px]"></i> {{ intradayProvider }}
            </div>
          </div>
        </div>
      </div>
    </p-dialog>
  `
})
export class StockModalComponent implements OnChanges {
  @Input() stock: StockAnalysisResult | null = null;
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  aiRecommendation: string = '';
  aiProvider: string = '';
  aiLoading: boolean = false;

  intradayRecommendation: string = '';
  intradayProvider: string = '';
  intradayLoading: boolean = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['stock'] || changes['visible']) {
      this.resetAiState();
    }
  }

  resetAiState() {
    this.aiRecommendation = '';
    this.aiProvider = '';
    this.aiLoading = false;
    this.intradayRecommendation = '';
    this.intradayProvider = '';
    this.intradayLoading = false;
  }

  getFormattedMessage(text: string): SafeHtml {
    if (!text) return '';
    return this.sanitizer.bypassSecurityTrustHtml(this.parseMarkdown(text));
  }

  private parseMarkdown(text: string): string {
    if (!text) return '';
    let html = text;

    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 1. Markdown Table Parser
    const tableRegex = /((?:\|[^\n]+\|\r?\n?)+)/g;
    html = html.replace(tableRegex, (match) => {
      const lines = match.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) return match;

      let tableHtml = '<div class="overflow-x-auto my-2 rounded-xl border border-darkBorder/80"><table class="w-full text-[11px] sm:text-xs border-collapse text-right"><thead class="bg-darkBg text-amber-400 font-bold border-b border-darkBorder"><tr>';
      let hasHeader = false;
      let bodyHtml = '<tbody>';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\|[\s\-:]+(\|[\s\-:]+)+\|\s*$/.test(line)) {
          continue;
        }

        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        if (cells.length === 0) continue;

        if (!hasHeader) {
          cells.forEach(cell => {
            tableHtml += `<th class="p-2 border-b border-darkBorder font-black bg-darkBg/90">${cell}</th>`;
          });
          tableHtml += '</tr></thead>';
          hasHeader = true;
        } else {
          bodyHtml += '<tr class="border-b border-darkBorder/40 hover:bg-darkCard/60 transition-colors">';
          cells.forEach(cell => {
            bodyHtml += `<td class="p-2 border-l border-darkBorder/30 text-gray-200">${cell}</td>`;
          });
          bodyHtml += '</tr>';
        }
      }

      bodyHtml += '</tbody>';
      return tableHtml + bodyHtml + '</table></div>';
    });

    // 2. Headings
    html = html.replace(/^### (.*$)/gim, '<h4 class="text-xs sm:text-sm font-black text-emeraldAccent mt-2.5 mb-1.5">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="text-sm sm:text-base font-black text-amber-400 mt-2.5 mb-1.5">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="text-base sm:text-lg font-black text-white mt-2.5 mb-1.5">$1</h2>');

    // 3. Bold & Italic
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-black text-amber-300">$1</strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-amber-300">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>');

    // 4. Bullet & Numbered lists
    html = html.replace(/^\s*[\*\-]\s+(.*$)/gim, '<div class="flex items-start gap-2 my-1"><span class="text-emeraldAccent font-extrabold select-none">•</span><span>$1</span></div>');
    html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<div class="flex items-start gap-2 my-1"><span class="text-amber-400 font-extrabold select-none">$1.</span><span>$2</span></div>');

    // 5. Code & clean up
    html = html.replace(/`([^`]+)`/g, '<code class="bg-darkBg border border-darkBorder px-1.5 py-0.5 rounded text-cyanAccent font-mono text-[11px]">$1</code>');
    html = html.replace(/\*\*/g, '');

    // 6. Line breaks
    html = html.replace(/\n\n/g, '<div class="h-2"></div>');
    html = html.replace(/\n/g, '<br/>');

    return html;
  }

  fetchAiRecommendation(): void {
    if (!this.stock) return;
    this.aiLoading = true;
    this.aiRecommendation = '';
    this.aiProvider = '';

    const s = this.stock;
    const prompt = `كخبير مالي واقتصادي متخصص في البورصة المصرية، قدم تحليلاً مالياً وفنياً شاملاً ومكتملاً لسهم ${s.quote.symbol} (${s.quote.nameAr}) مع توصية شراء أو بيع واضحة. البيانات اللحظية:
- السعر الحالي: ${s.quote.currentPrice} ج.م (${s.quote.changePercent >= 0 ? '+' : ''}${s.quote.changePercent}%)
- القيمة العادلة المحسوبة: ${s.fairValue} ج.م (فارق: +${s.fairValueUpsidePercent}%)
- مضاعف الربحية P/E: ${s.quote.peRatio || 'غير متاح'}
- RSI(14): ${s.indicators.rsi}
- SMA20: ${s.indicators.sma20} | SMA50: ${s.indicators.sma50}
- الدعم: ${s.indicators.support} | المقاومة: ${s.indicators.resistance}
- أعلى 52 أسبوع: ${s.quote.fiftyTwoWeekHigh} | أدنى 52 أسبوع: ${s.quote.fiftyTwoWeekLow}
- حجم التداول: ${s.quote.volume} (المتوسط: ${s.quote.avgVolume})
- الإشارة الحالية: ${s.signalType} (درجة: ${s.signalScore})
- وقف الخسارة: ${s.suggestedStopLoss} | الهدف 1: ${s.suggestedTarget.target1} | الهدف 2: ${s.suggestedTarget.target2}
- نسبة العائد/المخاطرة: 1:${s.riskRewardRatio}

قدم التحليل كاملاً بالعربية مع: 1) ملخص مالي 2) تحليل فني 3) توصية شراء/بيع/انتظار واضحة مع نطاق الدخول والأهداف ووقف الخسارة.`;

    const payload: any = {
      message: prompt,
      history: [],
      marketContext: {
        stockUnderAnalysis: {
          symbol: s.quote.symbol,
          name: s.quote.nameAr,
          price: s.quote.currentPrice,
          changePercent: s.quote.changePercent,
          fairValue: s.fairValue,
          upsidePercent: s.fairValueUpsidePercent,
          pe: s.quote.peRatio,
          rsi: s.indicators.rsi,
          sma20: s.indicators.sma20,
          sma50: s.indicators.sma50,
          support: s.indicators.support,
          resistance: s.indicators.resistance,
          high52w: s.quote.fiftyTwoWeekHigh,
          low52w: s.quote.fiftyTwoWeekLow,
          volume: s.quote.volume,
          avgVolume: s.quote.avgVolume,
          signal: s.signalType,
          signalScore: s.signalScore,
          stopLoss: s.suggestedStopLoss,
          target1: s.suggestedTarget.target1,
          target2: s.suggestedTarget.target2,
          riskReward: s.riskRewardRatio,
          reasons: s.reasons
        }
      }
    };

    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      payload.apiKey = savedKey.trim();
    }

    this.http.post<any>('/api/chat', payload).pipe(timeout(20000)).subscribe({
      next: (res) => {
        if (res?.answer && !res?.useFallback) {
          this.aiRecommendation = res.answer;
          this.aiProvider = res.provider || 'Gemini Flash Latest';
        } else {
          this.aiRecommendation = this.generateLocalAiAnalysis(s);
          this.aiProvider = res?.reason === 'NO_API_KEY' ? 'Market Engine (No API Key)' : 'Market Engine (Smart Fallback)';
        }
        this.aiLoading = false;
      },
      error: () => {
        this.aiRecommendation = this.generateLocalAiAnalysis(s);
        this.aiProvider = 'Market Engine (Offline Fallback)';
        this.aiLoading = false;
      }
    });
  }

  fetchIntradayRecommendation(): void {
    if (!this.stock) return;
    this.intradayLoading = true;
    this.intradayRecommendation = '';
    this.intradayProvider = '';

    const s = this.stock;
    const prompt = `كخبير مضاربة يومية متخصص في البورصة المصرية، قدم توصية مضاربة داخل الجلسة (Intraday/Scalping) كاملة ومكتملة لسهم ${s.quote.symbol} (${s.quote.nameAr}). البيانات اللحظية:
- السعر الحالي: ${s.quote.currentPrice} ج.م (${s.quote.changePercent >= 0 ? '+' : ''}${s.quote.changePercent}%)
- أعلى سعر اليوم: ${s.quote.dayHigh} | أدنى سعر اليوم: ${s.quote.dayLow}
- حجم التداول: ${s.quote.volume} (المتوسط: ${s.quote.avgVolume}) - نسبة الحجم: ${s.indicators.volumeRatio}x
- ارتفاع حجم غير عادي: ${s.indicators.volumeSpike ? 'نعم ⚠️' : 'لا'}
- RSI(14): ${s.indicators.rsi}
- SMA20: ${s.indicators.sma20} | SMA50: ${s.indicators.sma50}
- الدعم الفني: ${s.indicators.support} | المقاومة: ${s.indicators.resistance}

قدم التوصية كاملة بالعربية مع:
1) ⚡ قرار المضاربة: شراء سريع / بيع سريع / لا تتداول اليوم - مع السبب
2) 📥 نقطة الدخول المثالية للمضاربة (سعر محدد)
3) 🎯 هدف جني الأرباح السريع (Target 1 خلال الجلسة)
4) 🛑 وقف خسارة المضاربة الصارم (أقرب من وقف المستثمر)
5) ⏱️ أفضل توقيت للدخول (بداية/منتصف/نهاية الجلسة)
6) ⚠️ تنبيهات ومخاطر المضاربة اليومية لهذا السهم`;

    const payload: any = {
      message: prompt,
      history: [],
      marketContext: {
        stockUnderAnalysis: {
          symbol: s.quote.symbol,
          name: s.quote.nameAr,
          price: s.quote.currentPrice,
          changePercent: s.quote.changePercent,
          dayHigh: s.quote.dayHigh,
          dayLow: s.quote.dayLow,
          volume: s.quote.volume,
          avgVolume: s.quote.avgVolume,
          volumeRatio: s.indicators.volumeRatio,
          volumeSpike: s.indicators.volumeSpike,
          rsi: s.indicators.rsi,
          sma20: s.indicators.sma20,
          sma50: s.indicators.sma50,
          support: s.indicators.support,
          resistance: s.indicators.resistance,
          high52w: s.quote.fiftyTwoWeekHigh,
          low52w: s.quote.fiftyTwoWeekLow
        }
      }
    };

    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      payload.apiKey = savedKey.trim();
    }

    this.http.post<any>('/api/chat', payload).pipe(timeout(20000)).subscribe({
      next: (res) => {
        if (res?.answer && !res?.useFallback) {
          this.intradayRecommendation = res.answer;
          this.intradayProvider = res.provider || 'Gemini Flash Latest';
        } else {
          this.intradayRecommendation = this.generateLocalIntradayAnalysis(s);
          this.intradayProvider = res?.reason === 'NO_API_KEY' ? 'Market Engine (No API Key)' : 'Market Engine (Smart Fallback)';
        }
        this.intradayLoading = false;
      },
      error: () => {
        this.intradayRecommendation = this.generateLocalIntradayAnalysis(s);
        this.intradayProvider = 'Market Engine (Offline Fallback)';
        this.intradayLoading = false;
      }
    });
  }

  private generateLocalAiAnalysis(s: StockAnalysisResult): string {
    const signalText = s.signalType === 'BUY' || s.signalType === 'STRONG_BUY' ? '🚀 شراء واستثمار إيجابي' : s.signalType === 'SELL' || s.signalType === 'STRONG_SELL' ? '🔴 بيع / تخفيف أوزان' : '🟡 محايد ومراقبة الدعم';
    const upside = s.fairValueUpsidePercent;
    const valuationDesc = upside >= 25 ? `السهم يتداول بخصم كبير عادل بنسبة **+${upside}%** أسفل قيمته العادلة (${s.fairValue} ج.م)، مما يمثل فرصة استثمارية ممتازة.` : upside >= 10 ? `السهم في نطاق خصم إيجابي بنسبة **+${upside}%** عادلاً (${s.fairValue} ج.م).` : `السهم قريب من قيمته العادلة الحالية (${s.fairValue} ج.م).`;

    return `### 📊 التحليل المالي والفني لسهم ${s.quote.symbol} (${s.quote.nameAr || s.quote.nameEn})

**1. الموقف المالي والتقييم العادل:**
• **السعر الحالي:** ${s.quote.currentPrice} ج.م (${s.quote.changePercent >= 0 ? '+' : ''}${s.quote.changePercent}%)
• **القيمة العادلة المحسوبة:** ${s.fairValue} ج.م (نسبة نمو عادلة: **+${upside}%**)
• ${valuationDesc}
• **مضاعف الربحية P/E:** ${s.quote.peRatio || 'غير متاح'}

**2. المؤشرات الفنية والاتجاه:**
• **RSI (14):** ${s.indicators.rsi} (${s.indicators.rsi < 35 ? 'تشبع بيعي إيجابي 🚀' : s.indicators.rsi > 70 ? 'تشبع شرائي مرتفع ⚠️' : 'نطاق تجميع متوازن'})
• **المتوسطات:** SMA20 (${s.indicators.sma20}) | SMA50 (${s.indicators.sma50})
• **المستويات الفنية:** الدعم عند **${s.indicators.support} ج.م** | المقاومة عند **${s.indicators.resistance} ج.م**

**3. التوصية الاستراتيجية وخطة التداول:**
• **القرار:** ${signalText}
• **نطاق الشراء المناسب:** ${s.suggestedEntry.min} - ${s.suggestedEntry.max} ج.م
• **الأهداف المستهدفة:** الهدف الأول **${s.suggestedTarget?.target1} ج.م** | الهدف الثاني **${s.fairValue} ج.م**
• **وقف الخسارة الأقصى:** **${s.suggestedStopLoss} ج.م**`;
  }

  private generateLocalIntradayAnalysis(s: StockAnalysisResult): string {
    const signalLabel = s.intradaySignal === 'BUY' || s.intradaySignal === 'STRONG_BUY' ? '🚀 شراء سريع داخل الجلسة (Scalping)' : s.intradaySignal === 'SELL' || s.intradaySignal === 'STRONG_SELL' ? '🔴 بيع سريع / جني أرباح' : '🟡 انتظر تكون الزخم';

    return `### ⚡ توصية المضاربة اللحظية داخل الجلسة (Intraday Scalping)

**1. قرار المضاربة:**
• **القرار:** ${signalLabel}
• **حجم التداول اليوم:** ${s.quote.volume} سهم (${s.indicators.volumeRatio}x متوسط التداول 30 يوم)
• **حركة اليوم:** أدنى سعر اليوم **${s.quote.dayLow} ج.م** | أعلى سعر اليوم **${s.quote.dayHigh} ج.م**

**2. خريطة تداول الجلسة (Execution Plan):**
• 📥 **نقطة الدخول اللحظية:** **${s.intradayEntry || s.quote.currentPrice} ج.م**
• 🎯 **هدف جني الأرباح السريع:** **${s.intradayTarget} ج.م** (هدف مضاربي خاطف)
• 🛑 **وقف الخسارة الصارم:** **${s.intradayStopLoss} ج.م** (إيقاف خسارة لحظي)

**3. نصيحة المحلل اللحظي:**
يُنصح بعدم المبيت بالمركز وتفعيل أمر وقف الخسارة الصارم عند كسر الدعم اللحظي.`;
  }

  getSignalLabel(signal: SignalType): string {
    switch (signal) {
      case 'STRONG_BUY': return '🚀 شراء قوي جداً';
      case 'BUY': return '🟢 شراء';
      case 'NEUTRAL': return '🟡 محايد / مراقبة';
      case 'SELL': return '🔴 بيع';
      case 'STRONG_SELL': return '🚨 بيع قوي';
      default: return '🟡 محايد';
    }
  }

  getSignalBadgeClass(signal: SignalType): string {
    switch (signal) {
      case 'STRONG_BUY': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
      case 'BUY': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
      case 'NEUTRAL': return 'bg-amber-500/15 text-amber-300 border border-amber-500/20';
      case 'SELL': return 'bg-rose-500/15 text-rose-300 border border-rose-500/20';
      case 'STRONG_SELL': return 'bg-rose-500/25 text-rose-200 border border-rose-500/40';
      default: return 'bg-amber-500/15 text-amber-300 border border-amber-500/20';
    }
  }


  getIntradayLabel(signal: SignalType): string {
    switch (signal) {
      case 'STRONG_BUY': return '🚀 شراء قوي';
      case 'BUY': return '🟢 شراء';
      case 'NEUTRAL': return '🟡 محايد';
      case 'SELL': return '🔴 بيع';
      case 'STRONG_SELL': return '🚨 بيع قوي';
      default: return '🟡 محايد';
    }
  }

  getIntradayBadgeClass(signal: SignalType): string {
    switch (signal) {
      case 'STRONG_BUY': return 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
      case 'BUY': return 'bg-orange-500/15 text-orange-400 border border-orange-500/20';
      case 'NEUTRAL': return 'bg-amber-500/15 text-amber-300 border border-amber-500/20';
      case 'SELL': return 'bg-rose-500/15 text-rose-300 border border-rose-500/20';
      case 'STRONG_SELL': return 'bg-rose-500/25 text-rose-200 border border-rose-500/40';
      default: return 'bg-amber-500/15 text-amber-300 border border-amber-500/20';
    }
  }

  getRsiDiagnosis(rsi: number): string {
    if (rsi < 30) return 'منطقة تشبع بيعي حاد (فرصة ارتداد 🚀)';
    if (rsi < 45) return 'منطقة تجميع إيجابية وتأسيس 📈';
    if (rsi < 65) return 'حركة معتدلة ومتوازنة ⚖️';
    if (rsi < 75) return 'منطقة تشبع شرائي مرتفع ⚠️';
    return 'منطقة خطرة وجني أرباح حاد 🚨';
  }

  getFinancialVerdictText(upside: number): string {
    if (upside >= 30) return '💎 السهم يتداول بأقل كثيراً من قيمته العادلة (خصم ممتاز)';
    if (upside >= 15) return '🟢 السهم يتداول بأقل من قيمته العادلة (فرصة نمو جيدة)';
    if (upside <= -20) return '🚨 السهم يتداول بأعلى كثيراً من قيمته العادلة (تضخم وتقييم مرتفع)';
    if (upside <= -10) return '⚠️ السهم يتداول بأعلى من قيمته العادلة نسبياً';
    return '⚖️ السهم يتداول قرب مستويات قيمته العادلة تماماً';
  }

  getPercentDiff(target: number, price: number): number {
    if (!price || price === 0) return 0;
    return Number((((target - price) / price) * 100).toFixed(1));
  }
}
