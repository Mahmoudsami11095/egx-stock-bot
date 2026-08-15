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
    path: 'intraday',
    loadComponent: () => import('./features/intraday-trading/intraday-trading.component').then(m => m.IntradayTradingComponent)
  },
  {
    path: 'strategies',
    loadComponent: () => import('./features/strategies/strategies.component').then(m => m.StrategiesComponent)
  },
  {
    path: 'gold',
    loadComponent: () => import('./features/gold-tracker/gold-tracker.component').then(m => m.GoldTrackerComponent)
  },
  {
    path: 'fair-value-compare',
    loadComponent: () => import('./features/fair-price-comparator/fair-price-comparator.component').then(m => m.FairPriceComparatorComponent)
  },
  {
    path: 'price-compare',
    loadComponent: () => import('./features/price-comparator/price-comparator.component').then(m => m.PriceComparatorComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
