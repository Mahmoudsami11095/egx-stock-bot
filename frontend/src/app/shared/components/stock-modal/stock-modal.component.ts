import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { StockAnalysisResult, SignalType } from '../../../core/models/stock.model';

@Component({
  selector: 'app-stock-modal',
  standalone: true,
  imports: [CommonModule, DialogModule],
  template: `
    <p-dialog [header]="stock ? stock.quote.nameAr + ' (' + stock.quote.symbol + ')' : ''"
              [(visible)]="visible"
              [modal]="true"
              [style]="{width: '90vw', maxWidth: '720px'}"
              [dismissableMask]="true"
              (onHide)="visibleChange.emit(false)">

      <div *ngIf="stock" class="space-y-6 text-gray-200">
        <!-- Badge & Sharia Header -->
        <div class="flex flex-wrap items-center justify-between gap-3 bg-darkCard/80 p-4 rounded-xl border border-darkBorder">
          <div>
            <span [class]="getSignalBadgeClass(stock.signalType)" class="px-3 py-1 rounded-full text-xs font-bold shadow-sm">
              {{ getSignalLabel(stock.signalType) }}
            </span>
            <span class="mr-2 text-xs font-bold text-gray-400">النتيجة: {{ stock.signalScore > 0 ? '+' : '' }}{{ stock.signalScore }}</span>
          </div>

          <div class="text-xs font-bold text-emeraldAccent bg-emeraldAccent/10 px-3 py-1 rounded-full border border-emeraldAccent/20">
            {{ stock.shariaStatusText }}
          </div>
        </div>

        <!-- Price vs Fair Value Breakdown -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="glass-card p-3 rounded-xl">
            <span class="text-xs text-gray-400 block">السعر اللحظي</span>
            <strong class="text-lg text-white font-black">{{ stock.quote.currentPrice }} ج.م</strong>
            <span [class]="stock.quote.changePercent >= 0 ? 'text-emeraldAccent' : 'text-roseAccent'" class="text-xs font-bold block mt-0.5">
              {{ stock.quote.changePercent >= 0 ? '+' : '' }}{{ stock.quote.changePercent }}%
            </span>
          </div>

          <div class="glass-card p-3 rounded-xl">
            <span class="text-xs text-gray-400 block">القيمة العادلة</span>
            <strong class="text-lg text-emeraldAccent font-black">{{ stock.fairValue }} ج.م</strong>
            <span class="text-xs text-emeraldAccent font-bold block mt-0.5">+{{ stock.fairValueUpsidePercent }}% نمو</span>
          </div>

          <div class="glass-card p-3 rounded-xl">
            <span class="text-xs text-gray-400 block">RSI (14)</span>
            <strong class="text-lg text-amberAccent font-black">{{ stock.indicators.rsi }}</strong>
            <span class="text-xs text-gray-400 block mt-0.5">{{ stock.indicators.rsi < 35 ? 'تشبع بيعي' : 'منطقة تجميع' }}</span>
          </div>

          <div class="glass-card p-3 rounded-xl">
            <span class="text-xs text-gray-400 block">مضاعف P/E</span>
            <strong class="text-lg text-cyanAccent font-black">{{ stock.quote.peRatio || 'N/A' }}</strong>
            <span class="text-xs text-gray-400 block mt-0.5">مقارنة بالقطاع</span>
          </div>
        </div>

        <!-- Technical Indicators Grid -->
        <div class="bg-darkCard/60 p-4 rounded-xl border border-darkBorder space-y-2">
          <h4 class="text-sm font-bold text-gray-300 flex items-center gap-2">
            <i class="pi pi-sliders-h text-emeraldAccent"></i> المؤشرات الفنية والتذبذب
          </h4>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div><span class="text-gray-400">SMA20 / SMA50:</span> <strong class="text-white">{{ stock.indicators.sma20 }} / {{ stock.indicators.sma50 }}</strong></div>
            <div><span class="text-gray-400">MACD:</span> <strong class="text-white">{{ stock.indicators.macd?.macd || 'N/A' }}</strong></div>
            <div><span class="text-gray-400">ADX Trend:</span> <strong class="text-white">{{ stock.indicators.adx || '20' }}</strong></div>
            <div><span class="text-gray-400">ATR Volatility:</span> <strong class="text-white">{{ stock.indicators.atr }} ج.م</strong></div>
            <div><span class="text-gray-400">الدعم:</span> <strong class="text-emeraldAccent">{{ stock.indicators.support }} ج.م</strong></div>
            <div><span class="text-gray-400">المقاومة:</span> <strong class="text-roseAccent">{{ stock.indicators.resistance }} ج.م</strong></div>
          </div>
        </div>

        <!-- Actionable Trading & Risk Plan -->
        <div class="glass-card p-4 rounded-xl border-emeraldAccent/30 space-y-3">
          <h4 class="text-sm font-black text-emeraldAccent flex items-center gap-2">
            <i class="pi pi-compass"></i> خطة التداول ونسبة المخاطرة (Trading & Risk Plan)
          </h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div class="bg-darkBg/60 p-3 rounded-lg border border-darkBorder">
              <span class="text-gray-400 block">📥 نطاق الدخول الآمن:</span>
              <strong class="text-emeraldAccent text-sm font-bold">{{ stock.suggestedEntry.min }} - {{ stock.suggestedEntry.max }} ج.م</strong>
            </div>

            <div class="bg-darkBg/60 p-3 rounded-lg border border-darkBorder">
              <span class="text-gray-400 block">🎯 الهدف الأول (Target 1):</span>
              <strong class="text-white text-sm font-bold">{{ stock.suggestedTarget.target1 }} ج.م</strong>
            </div>

            <div class="bg-darkBg/60 p-3 rounded-lg border border-darkBorder">
              <span class="text-gray-400 block">🚀 الهدف الثاني (القيمة العادلة):</span>
              <strong class="text-emeraldAccent text-sm font-bold">{{ stock.suggestedTarget.target2 }} ج.م</strong>
            </div>

            <div class="bg-darkBg/60 p-3 rounded-lg border border-darkBorder">
              <span class="text-gray-400 block">🛑 وقف الخسارة (Stop Loss):</span>
              <strong class="text-roseAccent text-sm font-bold">{{ stock.suggestedStopLoss }} ج.م</strong>
            </div>

            <div class="bg-darkBg/60 p-3 rounded-lg border border-darkBorder">
              <span class="text-gray-400 block">💰 حجم المحفظة المقترح:</span>
              <strong class="text-amberAccent text-sm font-bold">{{ stock.positionSizePercent }}% من إجمالي المحفظة</strong>
            </div>

            <div class="bg-darkBg/60 p-3 rounded-lg border border-darkBorder">
              <span class="text-gray-400 block">⚖️ نسبة العائد للمخاطرة:</span>
              <strong class="text-cyanAccent text-sm font-bold">1:{{ stock.riskRewardRatio }}</strong>
            </div>
          </div>
        </div>

        <!-- Recommendation Reasons -->
        <div class="space-y-1 text-xs text-gray-300">
          <h4 class="font-bold text-gray-200">💡 أسباب التوصية:</h4>
          <ul class="list-disc list-inside space-y-1">
            <li *ngFor="let reason of stock.reasons">{{ reason }}</li>
          </ul>
        </div>
      </div>
    </p-dialog>
  `
})
export class StockModalComponent {
  @Input() stock: StockAnalysisResult | null = null;
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  getSignalLabel(signal: SignalType): string {
    switch (signal) {
      case 'STRONG_BUY': return '🚀 شراء قوي';
      case 'BUY': return '🟢 شراء';
      case 'NEUTRAL': return '🟡 محايد';
      case 'SELL': return '🔴 بيع';
      case 'STRONG_SELL': return '🚨 بيع قوي';
      default: return '🟡 محايد';
    }
  }

  getSignalBadgeClass(signal: SignalType): string {
    switch (signal) {
      case 'STRONG_BUY': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'BUY': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
      case 'NEUTRAL': return 'bg-amber-500/15 text-amber-300 border border-amber-500/20';
      case 'SELL': return 'bg-rose-500/15 text-rose-300 border border-rose-500/20';
      case 'STRONG_SELL': return 'bg-rose-500/25 text-rose-200 border border-rose-500/40';
      default: return 'bg-amber-500/15 text-amber-300 border border-amber-500/20';
    }
  }
}
