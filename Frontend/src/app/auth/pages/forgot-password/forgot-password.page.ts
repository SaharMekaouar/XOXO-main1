import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
@Component({
  selector: 'app-forgot-password',
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
})
export class ForgotPasswordPage {
  email = '';

  constructor(private authService: AuthService,private router: Router) {this.router = router;}

  message = '';
  isSubmitting = false;

  requestReset() {
    const email = this.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.message = 'Please enter a valid email address.';
      return;
    }

    this.isSubmitting = true;
    this.message = '';

    this.authService.forgotPassword(email).subscribe({
      next: (response: { message: string }) => {
        this.isSubmitting = false;
        this.message = response.message;
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Erreur de réinitialisation du mot de passe :', err);
        this.message = err?.error?.message || 'Could not send the reset email. Please try again.';
      }
    });
  }
  backlogin() {
    this.router.navigate(['/login']);
  }
  Home() {
    this.router.navigate(['/acceuil']);
  }
}


