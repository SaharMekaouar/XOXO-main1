import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule
  ],
  styleUrls: ['./verify-email.page.scss'],
})
export class VerifyEmailPage {
  constructor(
    private router: Router,
  ) {}

  goToVerification() {
    this.router.navigate(['/verification']);
  }
}
