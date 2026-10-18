import { Component, AfterViewInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { GoogleSignInService } from '../../services/google-signin.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { NotificationService } from '../../../shared/notification.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements AfterViewInit {
  email = '';
  password = '';

  rememberMe = false;
  isLoading = false;
  isNative = false;
  navCtrl: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notification: NotificationService,
    private googleSignIn: GoogleSignInService,
  ) {
    this.isNative = this.googleSignIn.isNative;
  }

  ngAfterViewInit() {
    this.googleSignIn.init();
  }

  async continueWithGoogle() {
    try {
      await this.googleSignIn.signIn();
    } catch (error) {
      console.error('Erreur de connexion Google:', error);
      this.notification.error('Connexion Google échouée. Réessayez.');
    }
  }

  goHome() {
    this.navCtrl.navigateRoot('/home');
  }

  login() {
    if (!this.email || !this.password) {
      this.notification.error('Veuillez remplir tous les champs.');
      return;
    }

    this.isLoading = true;

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        sessionStorage.setItem('loginChallenge', response.loginChallenge);
        this.router.navigate(['/verification'], { queryParams: { email: response.email, login: 'true' } });
      },
            error: (error) => {
        this.isLoading = false;
        console.error('🚨 Login failed:', error);
        if (error.status === 0) {
          this.notification.error('Impossible de joindre le serveur. Vérifiez le Wi-Fi et que le backend tourne.');
        } else if (error.status === 429) {
          this.notification.error('Trop de tentatives. Veuillez patienter une minute avant de réessayer.');
        } else {
          this.notification.error('Email ou mot de passe incorrect.');
        }
      }
    });
  }

  forgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  backsignup() {
    this.router.navigate(['/signup']);
  }
  goBack() {
    this.router.navigate(['/acceuil']);
  }
  Home() {
    this.router.navigate(['/acceuil']);
  }
}
