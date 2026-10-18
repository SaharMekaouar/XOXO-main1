import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { Router } from '@angular/router';

declare global {
  interface Window {
    google?: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class GoogleSignInService {
  readonly isNative = Capacitor.isNativePlatform();

  private webInitialized = false;
  private nativeInitialized = false;

  constructor(private authService: AuthService, private router: Router) {}

  // =====================================================
  // INITIALIZATION
  // =====================================================

  async init(): Promise<void> {
    try {
      if (this.isNative) {
        await this.initNative();
        return;
      }

      await this.initWeb();
    } catch (error) {
      console.error('Google Sign-In initialization error:', error);
    }
  }

  // =====================================================
  // SIGN IN
  // =====================================================

  async signIn(): Promise<void> {
    // ===================================================
    // ANDROID / NATIVE
    // ===================================================

    if (this.isNative) {
      await this.initNative();

      try {
        const loginResult = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile'],
          },
        });

        console.log('Google native login result:', loginResult);

        // The plugin type does not expose idToken directly,
        // so we safely read the returned result.
        const result: any = loginResult?.result;

        const token =
          result?.idToken ||
          result?.id_token ||
          result?.authentication?.idToken ||
          result?.authentication?.id_token;

        if (!token) {
          console.error(
            'Google login result does not contain an ID token:',
            loginResult
          );

          throw new Error('Google ID token missing');
        }

        console.log('Google ID token received successfully.');

        // Send Google ID token to your existing backend
        await firstValueFrom(
          this.authService.loginWithGoogle(token)
        );

        return;
      } catch (error) {
        console.error('Native Google Sign-In error:', error);
        throw error;
      }
    }

    // ===================================================
    // WEB
    // ===================================================

    await this.initWeb();

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      throw new Error(
        'Google Identity Services is not available.'
      );
    }
  }

  // =====================================================
  // NATIVE INITIALIZATION
  // =====================================================

  private async initNative(): Promise<void> {
    if (this.nativeInitialized || !this.isNative) {
      return;
    }

    const clientId = environment.googleClientId;

    if (!clientId) {
      throw new Error(
        'Google Client ID is missing from environment configuration.'
      );
    }

    try {
      await SocialLogin.initialize({
        google: {
          webClientId: clientId,
          mode: 'online',
        },
      });

      this.nativeInitialized = true;

      console.log('Google Native Sign-In initialized.');
    } catch (error) {
      console.error(
        'Google Native Sign-In initialization failed:',
        error
      );

      throw error;
    }
  }

  // =====================================================
  // GOOGLE WEB SCRIPT
  // =====================================================

  private loadGoogleIdentityService(): Promise<void> {
    if (window.google?.accounts?.id) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.getElementById(
        'google-script'
      ) as HTMLScriptElement | null;

      if (existing) {
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }

        existing.addEventListener('load', () => resolve());

        existing.addEventListener('error', () =>
          reject(
            new Error(
              'Google Identity Services script failed to load.'
            )
          )
        );

        return;
      }

      const script = document.createElement('script');

      script.id = 'google-script';

      script.src =
        'https://accounts.google.com/gsi/client';

      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log(
          'Google Identity Services loaded successfully.'
        );

        resolve();
      };

      script.onerror = () => {
        reject(
          new Error(
            'Google Identity Services script failed to load.'
          )
        );
      };

      document.head.appendChild(script);
    });
  }

  // =====================================================
  // WEB INITIALIZATION
  // =====================================================

  private async initWeb(): Promise<void> {
    if (this.isNative) {
      return;
    }

    try {
      await this.loadGoogleIdentityService();
    } catch (error) {
      console.error(
        'Google Identity Services non chargé:',
        error
      );

      return;
    }

    if (!window.google?.accounts?.id) {
      console.error(
        'Google Identity Services is not available.'
      );

      return;
    }

    // Initialize Google Identity Services only once
    if (!this.webInitialized) {
      window.google.accounts.id.initialize({
        client_id: environment.googleClientId,

        callback: (response: any) => {
          if (!response?.credential) {
            console.error(
              'Google credential is missing.'
            );

            return;
          }

          this.handleWebCredential(
            response.credential
          );
        },

        auto_select: false,
        cancel_on_tap_outside: true,
      });

      this.webInitialized = true;
    }

    // Render Google button if the container exists
    const buttonHost =
      document.getElementById(
        'googleSignInButton'
      );

    if (
      buttonHost &&
      !buttonHost.hasChildNodes()
    ) {
      window.google.accounts.id.renderButton(
        buttonHost,
        {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 320,
        }
      );
    }
  }

  // =====================================================
  // WEB GOOGLE CREDENTIAL
  // =====================================================

  private handleWebCredential(
    token: string
  ): void {
    if (!token) {
      console.error(
        'Google Web credential is empty.'
      );

      return;
    }

    this.authService
      .loginWithGoogle(token)
      .subscribe({
        next: (response) => {
          console.log(
            'Google Web login successful:',
            response
          );
        },

        error: (error) => {
          console.error(
            'Erreur de connexion Google:',
            error
          );
        },
      });
  }
}
