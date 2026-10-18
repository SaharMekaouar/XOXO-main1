import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NotificationService } from '../../../shared/notification.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verification',
  templateUrl: './verification.page.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  styleUrls: ['./verification.page.scss'],
})
export class VerificationPage implements OnInit {
  selectedMethod: 'email' | null = null;
  email = '';
  verificationEmail = '';
  verificationCode = '';
  isLoading = false;
  codeSent = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private notification: NotificationService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.email = email.trim().toLowerCase();
    }
    this.selectedMethod = 'email';
  }

  sendEmailVerification() {
    const loginChallenge = sessionStorage.getItem('loginChallenge');
    if (!this.email || !this.verificationEmail || !loginChallenge) {
      this.notification.error('Log in first, then enter the email that should receive your code.');
      return;
    }
    if (this.email === this.verificationEmail.trim().toLowerCase()) {
      this.notification.error('Use an email different from the login email.');
      return;
    }

    this.isLoading = true;
    this.authService.sendEmailVerification(this.email, this.verificationEmail, loginChallenge).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.codeSent = true;
        this.notification.success('Code sent! Check your inbox.');
      },
      error: (error) => {
        this.isLoading = false;
        const message = error?.error?.message;
        this.notification.error(Array.isArray(message) ? message.join(' ') : message || 'Failed to send verification email. Please try again.');
      }
    });
  }

  verifyEmailCode() {
    if (!/^\d{4}$/.test(this.verificationCode)) {
      this.notification.error('Enter the 4-digit code from your email.');
      return;
    }

    this.isLoading = true;
    this.authService.verifyEmail(this.email, this.verificationCode).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.authService.completeVerification(response);
        sessionStorage.removeItem('loginChallenge');
        this.notification.success('Email verified successfully!');
        this.router.navigate(['/acceuil-user']);
      },
      error: (error) => {
        this.isLoading = false;
        this.notification.error('Invalid or expired code. Please try again.');
      }
    });
  }

  goBack() {
    this.router.navigate(['/login']);
  }
}
