import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-auth-popup',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './auth-popup.component.html',
  styleUrls: ['./auth-popup.component.scss']
})
export class AuthPopupComponent {
  isFlipped = false;

  constructor(private modalCtrl: ModalController) {}

  flipCard() {
    this.isFlipped = !this.isFlipped;
  }

  redirectToLogin() {
    this.modalCtrl.dismiss();
    window.location.href = '/login';
  }

  redirectToSignup() {
    this.modalCtrl.dismiss();
    window.location.href = '/signup';
  }

  closePopup() {
    this.modalCtrl.dismiss();
  }
}

