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

  constructor(private authService: AuthService, private route: ActivatedRoute, private router: Router) {

  }
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'];
      this.token = params['token'];
      console.log('📩 Email et Token récupérés:', this.email, this.token);
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  resetPassword() {
    if (!this.email || !this.newPassword || !this.confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const data = { email: this.email, token: this.token, newPassword: this.newPassword };
    this.authService.resetPassword(data).subscribe({
      next: () => {
        //alert('Password updated successfully!');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Reset password error:', err);
        //alert('Error: Unable to reset password. Please try again.');
      },
    });
  }
  Home() {
    this.router.navigate(['/acceuil']);
  }
}
