import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { StockScreenerComponent } from './features/stock-screener/stock-screener.component';
import { GoldTrackerComponent } from './features/gold-tracker/gold-tracker.component';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent
  },
  {
    path: 'screener',
    component: StockScreenerComponent
  },
  {
    path: 'gold',
    component: GoldTrackerComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
