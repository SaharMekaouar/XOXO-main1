//devenue How it works page
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { Navbar } from "../navbar/navbar";
import { Footer } from '../footer/footer';
import { Capacitor } from '@capacitor/core';
@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, Navbar, Footer]
})
export class ContactPage implements OnInit {
  readonly isNative = Capacitor.isNativePlatform();



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
   // console.log('🔐 Authenticated:', this.isAuthenticated);
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


  Contact() {
    this.router.navigate(['/contact']); 
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
    

    this.router.navigate(['signup']);
  }
  logout() {
    this.authService.logout();
    this.isAuthenticated = false;
    this.username = null;
    this.router.navigate(['/acceuil']); 
    this.showLogout = false;
    ;

  }
  getFirstLetter(name: string | undefined | null): string {
    return name ? name.charAt(0).toUpperCase() : '';
  }
}
