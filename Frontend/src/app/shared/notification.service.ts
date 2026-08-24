import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private toastController: ToastController) {}

  async success(message: string) {
    await this.show(message, 'success', 'checkmark-circle-outline');
  }

  async error(message: string) {
    await this.show(message, 'danger', 'alert-circle-outline');
  }

  async info(message: string) {
    await this.show(message, 'primary', 'information-circle-outline');
  }

  private async show(message: string, color: string, icon: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3500,
      position: 'top',
      color,
      icon,
      cssClass: 'app-toast',
      buttons: [
        {
          icon: 'close-outline',
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }
}