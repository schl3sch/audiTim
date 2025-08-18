import { Routes } from '@angular/router';
import { Admin } from './admin/admin';
import { Zweid } from './zweid/zweid';
import { Heatmap } from './heatmap/heatmap';

export const routes: Routes = [
  { path: 'admin', component: Admin },
  { path: 'zweid', component: Zweid },
  { path: 'heatmap', component: Heatmap },
  { path: '', redirectTo: 'admin', pathMatch: 'full' }
];
