import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { provideStorage } from '@ionic/storage-angular';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { AuthInterceptor } from './app/auth/auth.interceptor';
import { appProviders } from './app/providers';
import { addIcons } from 'ionicons';
import {
  heart, menu, heartOutline, trash,
  shareSocialOutline, shareOutline, mailOutline, pin, pinOutline, downloadOutline, linkOutline, copyOutline, menuOutline, languageOutline,
  logoUsd, logoEuro, globeOutline, earthOutline, documentOutline, documentTextOutline, expandOutline, contractOutline, ellipsisHorizontalOutline,
  createOutline, saveOutline, homeOutline, helpCircleOutline,
  flagOutline,
  chevronUpOutline,
  chevronDownOutline,
} from 'ionicons/icons';

addIcons({
  heart, helpCircleOutline, homeOutline, pin, pinOutline,'flag-outline': flagOutline,'chevron-up-outline': chevronUpOutline,
  trash, shareSocialOutline, menu, mailOutline,'chevron-down-outline': chevronDownOutline,
  linkOutline, heartOutline, downloadOutline,
  documentTextOutline, copyOutline, shareOutline,
  menuOutline, languageOutline, logoUsd, logoEuro,
  globeOutline, earthOutline, documentOutline,
  expandOutline, contractOutline, ellipsisHorizontalOutline,
  createOutline, saveOutline
});
const storageProvider = {
  provide: 'ionic-storage',
  useFactory: () => {
    const platformId = inject(PLATFORM_ID);
    return provideStorage(platformId, {
      name: '__mydb',
      driverOrder: ['indexeddb', 'sqlite', 'websql']
    });
  }
};
bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    storageProvider,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    ...appProviders,
  ],
});
