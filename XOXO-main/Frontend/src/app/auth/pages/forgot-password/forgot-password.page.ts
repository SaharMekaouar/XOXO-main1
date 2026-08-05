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

  requestReset() {
    if (!this.email) {
      alert('Veuillez entrer votre adresse e-mail.');
      return;
    }

    this.authService.forgotPassword(this.email).subscribe({
      next: (response: { email: string; token: string }) => { 
        //alert('Check your email for the reset link!');
        this.router.navigate(['/reset-password'], { queryParams: { email: this.email, token: response.token } });
      },
      error: (err) => console.error('Erreur de réinitialisation du mot de passe :', err)
    });

  }
  backlogin() {
    this.router.navigate(['/login']);
  }
  Home() {
    this.router.navigate(['/acceuil']);
  }
}


