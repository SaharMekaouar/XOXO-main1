import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { probeAndCacheApiUrl } from './core/api.config';
import { GoogleSignInService } from './auth/services/google-signin.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, RouterModule, CommonModule],
})
export class AppComponent {
  constructor(googleSignIn: GoogleSignInService) {
    probeAndCacheApiUrl().catch(() => undefined);
    googleSignIn.init().catch(() => undefined);
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => undefined);
      StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => undefined);
      StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
    }
  }
}
