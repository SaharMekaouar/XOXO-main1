//devenue How it works page
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class Navbar implements OnInit {



  uploadedFileName: string = '';
  uploadedFile: File | null = null;
  mediaUrl: string = '';
  isAuthenticated = false;
  username: string | null = null;
  showLogout = false; 

  constructor( private router: Router, private authService: AuthService) {} // Injection correcte de Router


  Home() {
    // Réinitialiser les fichiers uploadés et les champs
    this.uploadedFile = null;
    this.uploadedFileName = '';
    this.mediaUrl = '';

    // Réinitialiser l'input file (pour éviter qu'il garde l'ancien fichier)
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; // Réinitialisation de l'élément HTML input file
    }

    this.router.navigate(['/acceuil']);
  }
   ngOnInit() {
    // S'abonner aux changements d'état d'authentification
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
      console.log('🔐 Auth state changed:', isAuth);
      
      // Mettre à jour le username à chaque changement d'état
      this.username = localStorage.getItem('username');
    });

    // Initialiser l'état
    this.isAuthenticated = this.authService.isLoggedIn();
    this.username = localStorage.getItem('username');
  }
  Homeuser() {
    this.uploadedFile = null;
    this.uploadedFileName = '';
    this.mediaUrl = '';

    // Réinitialiser l'input file (pour éviter qu'il garde l'ancien fichier)
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; // Réinitialisation de l'élément HTML input file
    }

    // Réinitialiser l'input URL
    const urlInput = document.getElementById('urlInput') as HTMLInputElement;
    if (urlInput) {
      urlInput.value = ''; // Réinitialisation de l'élément HTML input URL
    }

    this.router.navigate(['/acceuil-user']);
  }
  Acceuil() {
    this.router.navigate(['/acceuil']); // 
  }

  Contact() {
    this.router.navigate(['/contact']); // Navigation fonctionnelle
  }
  History() {
    this.router.navigate(['/history']);
  }
  Historyuser() {
    this.router.navigate(['/history-user']);
  }
  login() {
    this.router.navigate(['/login']);
  }
  signup() {
    // Déconnexion de l'utilisateur (peut être améliorée avec JWT plus tard)

    this.router.navigate(['signup']);
  }
  logout() {
    this.authService.logout();
    this.isAuthenticated = false;
    this.username = null;
    this.router.navigate(['/acceuil']); // Redirection après déconnexion
    this.showLogout = false; // Cache avant action
    

  }
  getFirstLetter(name: string | undefined | null): string {
    return name ? name.charAt(0).toUpperCase() : '';
  }
}
