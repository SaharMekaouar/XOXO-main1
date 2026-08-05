import { Component, OnInit,ViewChild, ElementRef, AfterViewInit, NgZone, ChangeDetectorRef  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AuthService } from '../auth/services/auth.service';
import { Router } from '@angular/router';
import { IonRouterOutlet } from '@ionic/angular';
import { IonicModule, AlertController, LoadingController } from '@ionic/angular';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Navbar } from "../navbar/navbar"; // Import HttpClient


@Component({
  selector: 'app-acceuil-user',
  templateUrl: './acceuil-user.page.html',
  styleUrls: ['./acceuil-user.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Navbar
]

})
export class AcceuilUserPage implements OnInit,AfterViewInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  isAuthenticated = false;
  username: string | null = null;
  uploadedFileName: string = '';
  uploadedFile: File | null = null;
  mediaUrl: string = '';
  isLoading: boolean = false;  // Flag to track the loading state
  loadingMessage: string = 'Converting...';  // Message during conversion
  transcribedText: string = '';
  showLogout = false; // Contrôle direct de la visibilité



  constructor(
    private router: Router,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private http: HttpClient,
   ) { }


  ngOnInit() {
    this.isAuthenticated = this.authService.isLoggedIn();
    console.log('🔐 Authenticated:', this.isAuthenticated);
    this.authService.username$.subscribe(digits => this.username = digits);
    this.username = localStorage.getItem('username');
    console.log('🔑 Username:', this.username);
  }
  ngAfterViewInit() {
    console.log('fileInput chargé ?', this.fileInputRef.nativeElement);
  }


  logout() {
    this.authService.logout();
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    this.router.navigate(['/login']);
    logout: this.showLogout = false; // Cache avant action


  }
  getFirstLetter(name: string | undefined | null): string {
    return name ? name.charAt(0).toUpperCase() : '';
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

  History() {
    this.router.navigate(['/history']);
  }
  Contact() {
    this.router.navigate(['/contact']);
  }

  triggerFileInput() {
    setTimeout(() => {
      if (this.fileInputRef && this.fileInputRef.nativeElement) {
        console.log('fileInput déclenché');
        this.fileInputRef.nativeElement.click();
      }
    }, 300);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadedFile = file;
      this.uploadedFileName = file.name;
      this.mediaUrl = '';

      this.ngZone.run(() => {
        this.uploadedFile = file;
        this.uploadedFileName = file.name;
        this.mediaUrl = '';
        console.log('Fichier sélectionné :', this.uploadedFileName);
        this.cdr.detectChanges();
      });

      input.value = '';
    } else {
      this.uploadedFile = null;
      this.uploadedFileName = '';
    }
  }




  canConvert(): boolean {
    return !!this.uploadedFile || (!!this.mediaUrl && this.mediaUrl.trim().length > 0);
  }
  async presentLoading() {
    const loading = await this.loadingCtrl.create({
      message: 'Converting...',  // Custom message
      spinner: 'crescent',  // Spinner type
      cssClass: 'full-page-loading',  // Custom CSS class to style the full page spinner
      backdropDismiss: false,  // Disable dismiss when clicked outside
    });

    await loading.present();  // Show the loading spinner
    return loading;  // Return the loading instance
  }
  async convertToText() {
    if (!this.canConvert()) {
      alert('Please select a file or enter a URL before continuing.');
      return;
    }

    this.isLoading = true;
    this.loadingMessage = 'Converting...';

    let formData = new FormData();
    let apiUrl = '';

    if (this.uploadedFile) {
      apiUrl = 'https://714e-154-111-224-232.ngrok-free.app/ai/transcribe';
      formData.append('file', this.uploadedFile);

      const loading = await this.loadingCtrl.create({
        spinner: 'crescent',
        message: this.loadingMessage,
        cssClass: 'full-page-loading',
      });
      await loading.present();

      const token = this.authService.getToken();
      if (!token) {
        alert('Error: Token not available. Please log in.');
        return;
      }

      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`
      });


      this.http.post<{ text: string }>(apiUrl, formData, { headers }).subscribe({
        next: (response) => {
          console.log('✅ Réponse reçue:', response);
          if (response.text) {
            this.transcribedText = response.text;
            this.router.navigate(['/view'], { queryParams: { text: this.transcribedText } });
          } else {
            alert("Transcription failed.");
          }
          this.isLoading = false;
          loading.dismiss();
        },
        error: (error) => {
          console.error('🚨 Erreur de transcription:', error);
          alert('Error during transcription. Please check the file or the URL.');
          this.isLoading = false;
          loading.dismiss();
        }
      });

    } else if (this.mediaUrl.trim()) {
      apiUrl = 'https://714e-154-111-224-232.ngrok-free.app/ai/process';
      const requestBody = { url: encodeURIComponent(this.mediaUrl) };


      const loading = await this.loadingCtrl.create({
        spinner: 'crescent',
        message: this.loadingMessage,
        cssClass: 'full-page-loading',
      });
      await loading.present();


      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authService.getToken()}`,
      };

      this.http.post<{ text: string }>(apiUrl, requestBody, { headers }).subscribe({
        next: (response) => {
          console.log('✅ Réponse reçue:', response);
          if (response.text) {
            this.transcribedText = response.text;
            this.router.navigate(['/view'], { queryParams: { text: this.transcribedText } });
          } else {
            alert("The transcription failed..");
          }
          this.isLoading = false;
          loading.dismiss();
        },
        error: (error) => {
          console.error('🚨 Erreur de transcription:', error);
          alert('Transcription error. Please check the file or the URL.');
          this.isLoading = false;
          loading.dismiss();
        }
      });
    }
  }



}
