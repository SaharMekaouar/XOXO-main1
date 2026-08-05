import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

declare global {
  interface Window {
    google?: any;
  }
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss']
})
export class SignupPage implements OnInit {
  user = { name: '', email: '', password: '' };

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    if (!window.google) {
      this.loadGoogleIdentityService();
    } else {
      this.initializeGoogleSignIn();
    }
  }

  loadGoogleIdentityService() {
    if (document.getElementById('google-script')) return; 

    const script = document.createElement('script');
    script.id = 'google-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initializeGoogleSignIn();
    document.head.appendChild(script);
  }

  initializeGoogleSignIn() {
    if (!window.google) {
      console.error('Google Identity Services non chargé');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: '283729564854-tcu951t4hhh4ia3igcsmb0q53rvuh9uq.apps.googleusercontent.com',
      callback: (response: any) => this.googleLogin(response.credential),
      prompt: 'select_account'
    });

    window.google.accounts.id.renderButton(
      document.getElementById('googleSignInButton'),
      { theme: 'outline', size: 'large', text: 'signup_with' }
    );

    window.google.accounts.id.prompt();
  }

  async googleLogin(token: string) {
    try {
      this.authService.loginWithGoogle(token).subscribe({
        next: (response) => {
          //console.log('Connexion réussie via Google:', response);
          sessionStorage.setItem('authToken', response.token); 
          sessionStorage.setItem('username', response.username);
          this.router.navigate(['/acceuil-user']);
        },
        error: (error) => {
          console.error('Erreur de connexion Google:', error);
         // alert('Connexion Google échouée. Veuillez réessayer.');
        }
      });
    } catch (error) {
      console.error('Erreur de gestion du token Google:', error);
    }
  }

  signup() {
    this.authService.signup(this.user.name,this.user.email, this.user.password).subscribe({
      next: (res: any) => {
        //console.log('Inscription réussie ✅');

      
        this.authService.setToken(res.token);
        //console.log('Token stocké:', res.token);

       
        const decoded = JSON.parse(localStorage.getItem('decodedToken')!);
        //console.log('🎉 Profil récupéré:', decoded);

        this.router.navigate(['/acceuil-user']);
      },
      error: (err) => {
        console.error('Erreur d\'inscription:', err);
        alert('Échec de l\'inscription. Vérifiez vos informations.');
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
