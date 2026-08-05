import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NavController } from '@ionic/angular';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  standalone: true, 
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  email = '';
  password = '';

  rememberMe = false; 
  errorMessage = '';
  isLoading = false; 
  navCtrl: any;

  constructor(private authService: AuthService, private router: Router) {}
  
  goHome() {
    this.navCtrl.navigateRoot('/home'); 
  }
  onLogin() {
   
    const mockApiResponse = {
      token: 'fake-jwt-token',
      user: { id: 1, name: 'John Doe', email: this.email }
    };

   
    this.authService.setToken(mockApiResponse.token);
    this.authService.setUser(mockApiResponse.user);

    console.log('User logged in:', mockApiResponse.user);
    //console.log('LocalStorage user:', localStorage.getItem('user')); 

   
    this.router.navigate(['/home']);
  }



    login() {
      this.authService.login(this.email, this.password).subscribe({
        next: (response) => {
          console.log('✅ Login successful:', response);
          localStorage.setItem('authToken', response.token);
          localStorage.setItem('name', response.username);
          localStorage.setItem('userId', response.userId);

          this.router.navigate(['/acceuil-user']);
        },
        error: (error) => {
          console.error('🚨 Login failed:', error);
        }
      });
    }



  forgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
  backsignup() {
    this.router.navigate(['/signup']);
  }
  goBack() {
    this.router.navigate(['/acceuil']); 
  }
  Home() {
    this.router.navigate(['/acceuil']);
  }

}
