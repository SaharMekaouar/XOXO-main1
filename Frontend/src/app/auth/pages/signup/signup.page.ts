import { Component, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GoogleSignInService } from '../../services/google-signin.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NotificationService } from '../../../shared/notification.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss']
})
export class SignupPage implements AfterViewInit {
  user = { name: '', email: '', phone: '', password: '' };
  isLoading = false;
  isNative = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private googleSignIn: GoogleSignInService,
    private notification: NotificationService,
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

  signup() {
    if (!this.user.name || !this.user.email || !this.user.password) {
      this.notification.error('Veuillez remplir tous les champs.');
      return;
    }

    this.isLoading = true;
    const email = this.user.email.trim().toLowerCase();
    this.authService.signup(this.user.name, email, this.user.password, this.user.phone).subscribe({
      next: () => {
        this.isLoading = false;
        this.notification.success('Inscription réussie !');
        this.router.navigate(['/acceuil-user']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Erreur d\'inscription:', err);
        this.notification.error(this.signupErrorMessage(err));
      }
    });
  }

  private signupErrorMessage(err: any): string {
    if (err?.status === 0) {
      return 'Impossible de joindre le serveur. Vérifiez le Wi-Fi et que le backend tourne.';
    }
    if (err?.status === 429) {
      return 'Trop de tentatives. Attendez une minute.';
    }
    const message = err?.error?.message;
    if (Array.isArray(message)) {
      return message.join('\n');
    }
    if (typeof message === 'string' && message.length) {
      return message;
    }
    return 'Échec de l\'inscription. Vérifiez vos informations.';
  }

  backlogin() {
    this.router.navigate(['/login']);
  }

  Home() {
    this.router.navigate(['/acceuil']);
  }
}
