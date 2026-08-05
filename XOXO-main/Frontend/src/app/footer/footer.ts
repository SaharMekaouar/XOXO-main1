import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class Footer implements OnInit {
  uploadedFileName: string = '';
  uploadedFile: File | null = null;
  mediaUrl: string = '';
  isAuthenticated = false;
  username: string | null = null;
  showLogout = false; 

  constructor( private router: Router, private authService: AuthService) {} 

  Home() {
    this.uploadedFile = null;
    this.uploadedFileName = '';
    this.mediaUrl = '';
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; 
    }
    this.router.navigate(['/acceuil']);
  }
  ngOnInit() {
    this.isAuthenticated = this.authService.isLoggedIn();
    console.log('🔐 Authenticated:', this.isAuthenticated);
    this.authService.username$.subscribe(digits => this.username = digits);
    this.username = localStorage.getItem('username');
    const user = localStorage.getItem('user');
  }
  Homeuser() {
    this.uploadedFile = null;
    this.uploadedFileName = '';
    this.mediaUrl = '';
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; 
    }
    const urlInput = document.getElementById('urlInput') as HTMLInputElement;
    if (urlInput) {
      urlInput.value = ''; 
    }

    this.router.navigate(['/acceuil-user']);
  }
  Acceuil() {
    this.router.navigate(['/acceuil']); 
  }

  Contact() {
    this.router.navigate(['/contact']); 
  }
  History() {
    this.router.navigate(['/history']);
  }
  Historyuser() {
    this.router.navigate(['/history-user']);
  }
  
}
