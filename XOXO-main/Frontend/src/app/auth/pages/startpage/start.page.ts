// start.page.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-start',
  standalone: true, 
  imports: [IonicModule], 
  template: `<ion-spinner name="crescent"></ion-spinner>`,
})
export class StartPage implements OnInit {
  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigateByUrl('/acceuil-user');
    } else {
      this.router.navigateByUrl('/acceuil');
    }
  }
}
