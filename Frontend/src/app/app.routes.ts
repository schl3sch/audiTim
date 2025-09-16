import { Routes } from '@angular/router';
import { Admin } from './admin/admin';
import { Zweid } from './zweid/zweid';
import { Heatmap } from './heatmap/heatmap';
import { Homepage } from './homepage/homepage';
import { DokuPdf } from './doku-pdf/doku-pdf';
import { Peekmap } from './peekmap/peekmap';

import { Login } from './login/login';
import { Register } from './register/register';

export const routes: Routes = [
  { path: 'homepage', component: Homepage },
  { path: 'admin', component: Admin },
  { path: 'zweid', component: Zweid },
  { path: 'heatmap', component: Heatmap },
  { path: 'peekmap', component: Peekmap },
  { path: 'doku-pdf', component: DokuPdf },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: '', redirectTo: 'homepage', pathMatch: 'full' }
];
