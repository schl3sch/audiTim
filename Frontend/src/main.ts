import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation  } from '@angular/router';
import { routes } from './app/app.routes';
import { App } from './app/app';
import 'zone.js';

bootstrapApplication(App, {
  providers: [
    provideRouter(routes, withHashLocation())
  ]
}).catch(err => console.error(err));