import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'screener',
    loadComponent: () => import('./features/stock-screener/stock-screener.component').then(m => m.StockScreenerComponent)
  },
  {
    path: 'gold',
    loadComponent: () => import('./features/gold-tracker/gold-tracker.component').then(m => m.GoldTrackerComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
