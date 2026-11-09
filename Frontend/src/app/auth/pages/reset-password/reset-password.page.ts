import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss']
})
export class ResetPasswordPage {
  email = '';
  newPassword = '';
  confirmPassword = '';
  token = '';
  showPassword = false;
  showConfirmPassword = false;
  isSubmitting = false;
  errorMessage = '';

  constructor(private authService: AuthService, private route: ActivatedRoute, private router: Router) {

  }
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'];
      this.token = params['token'];
      if (!this.email || !this.token) {
        this.errorMessage = 'This reset link is incomplete. Request a new password reset email.';
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  resetPassword() {
    if (!this.email || !this.token) {
      this.errorMessage = 'This reset link is invalid. Request a new password reset email.';
      return;
    }
    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Please fill in both password fields.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    const data = { email: this.email, token: this.token, newPassword: this.newPassword };
    this.authService.resetPassword(data).subscribe({
      next: () => {
        //alert('Password updated successfully!');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Reset password error:', err);
        this.errorMessage = err?.error?.message || 'Unable to reset password. The link may have expired; request a new one.';
      },
    });
  }
  Home() {
    this.router.navigate(['/acceuil']);
  }
}
