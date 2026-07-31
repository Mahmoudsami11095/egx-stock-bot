import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header.component';
import { AiChatbotComponent } from './shared/components/ai-chatbot/ai-chatbot.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, AiChatbotComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-darkBg text-gray-100 font-cairo">
      <!-- Top Navigation Header -->
      <app-header></app-header>

      <!-- Main Page Content -->
      <main class="flex-1 max-w-7xl w-full mx-auto px-4 pt-6">
        <router-outlet></router-outlet>
      </main>

      <!-- Floating AI Financial Assistant Widget -->
      <app-ai-chatbot></app-ai-chatbot>

      <!-- Footer -->
      <footer class="bg-darkCard/80 border-t border-darkBorder py-6 text-xs text-gray-400 mt-auto">
        <div class="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-1">
            <p class="font-bold text-gray-200">🕌 EGX Halal Stocks & Gold Intelligence Platform v2.0</p>
            <p>جميع الحقوق محفوظة © {{ currentYear }} — تحليل آلي أوتوماتيكي متوافق مع أحكام المعايير الشرعية AAOIFI.</p>
          </div>

          <div class="flex items-center gap-4 text-gray-400">
            <a href="https://docs.google.com/spreadsheets/d/17anSf-cjckoBaV3jhBD5IscwxONGKu79W3ekTSq8lck/edit?gid=0#gid=0"
               target="_blank" rel="noopener" class="hover:text-emeraldAccent transition-colors">
              <i class="pi pi-file-excel"></i> Google Sheets
            </a>
            <a href="https://stocks.templatesnippet.com/stocks" target="_blank" rel="noopener" class="hover:text-emeraldAccent transition-colors">
              <i class="pi pi-check-circle"></i> قاعدة البيانات الشرعية
            </a>
          </div>
        </div>
      </footer>
    </div>
  `
})
export class AppComponent {
  public currentYear = new Date().getFullYear();
}
