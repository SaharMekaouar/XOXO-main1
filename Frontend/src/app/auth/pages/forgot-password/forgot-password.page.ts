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
    if (!this.email) {
      alert('Veuillez entrer votre adresse e-mail.');
      return;
    }

    this.isSubmitting = true;

    this.authService.forgotPassword(this.email).subscribe({
      next: (response: { message: string }) => {
        this.isSubmitting = false;
        this.message = response.message;
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Erreur de réinitialisation du mot de passe :', err);
        this.message = "Une erreur est survenue. Veuillez réessayer.";
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


