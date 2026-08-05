import { CommonModule } from '@angular/common';
import { Component ,OnInit,ChangeDetectorRef} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../auth/services/auth.service';
import { HttpClient } from '@angular/common/http'; // Import HttpClient
import { LoadingController } from '@ionic/angular';  // <-- Import LoadingController
import { Observable, Subscribable } from 'rxjs';
import { AlertController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { lastValueFrom } from 'rxjs';


@Component({
  selector: 'app-acceuil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
],
  templateUrl: './acceuil.page.html',
  styleUrls: ['./acceuil.page.scss'],
})
export class AcceuilPage {
  uploadedFileName: string = '';
  transcribedText: string = '';
  uploadedFile: File | null = null;
  mediaUrl: string = '';
  isLoading: boolean = false;  // Flag to track the loading state
  loadingMessage: string = 'Converting...';  // Message during conversion
  isAuthenticated = false;
  last4Digits: string | null = null;
  showPopup = false;
 

  login() {
    this.router.navigate(['/login']);
  }
  userName: string = '';

  constructor(private router: Router,
              private cdr: ChangeDetectorRef ,
              private authService: AuthService,
              private http: HttpClient,
              private loadingCtrl: LoadingController,
              private loadingController: LoadingController,
              private alertCtrl: AlertController,
              private modalCtrl: ModalController,

  ) {
    this.authService.isAuthenticated$.subscribe(auth => this.isAuthenticated = auth);
    this.authService.username$.subscribe(digits => this.last4Digits = digits);
  }
  logout() {
    this.authService.logout();

    this.router.navigate(['/login']);

  }
  signup() {
    // Déconnexion de l'utilisateur (peut être améliorée avec JWT plus tard)

    this.router.navigate(['signup']);
  }

  ngOnInit() {
    this.isAuthenticated = this.authService.isLoggedIn(); // Vérifier l'authentification au chargement
    this.authService.isAuthenticated$.subscribe(auth => {
      this.isAuthenticated = auth;
      console.log('🔍 Statut Auth:', this.isAuthenticated);
    });
    const user = localStorage.getItem('user');
    if (user) {
      this.userName = JSON.parse(user).name;
    }
  }


  view() {
    if (this.transcribedText) {
      this.router.navigate(['/view'], { queryParams: { text: this.transcribedText } });
    } else {
      alert("Aucun fichier ou lien n'a été fourni !");
    }
  }


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


  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.uploadedFile = file;
      this.uploadedFileName = file.name; // Stocke le nom du fichier
      this.mediaUrl = ''; // Efface l'URL si un fichier est sélectionné

      console.log('Fichier sélectionné :', this.uploadedFileName);
    } else {
      this.uploadedFile = null;
      this.uploadedFileName = ''; // Efface le nom s'il n'y a pas de fichier
    }
  }

  // Vérifier si un fichier a été uploadé ou si une URL est fournie

    triggerFileInput() {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Show full-page loading spinner
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

  canConvert(): boolean {
    return !!this.uploadedFile || (!!this.mediaUrl && this.mediaUrl.trim().length > 0);
  }

  convertToText() {
    if (!this.canConvert()) {
      alert('Please select a file or enter a URL before continuing.');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      // L'utilisateur n'est pas connecté, afficher la popup de connexion
      this.showAuthPopup();
      return;
    }

    // L'utilisateur est connecté, procéder à la conversion
    this.http.post('URL_DU_BACKEND', { file: this.uploadedFile }, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe(response => {
      console.log("Conversion réussie :", response);
      // Aller vers la page de transcription après succès
      this.router.navigate(['/view']);
    }, error => {
      console.error("Erreur de conversion :", error);
    });
  }

  isFlipped = false;




  flipCard() {
    this.isFlipped = !this.isFlipped;
  }

  showAuthPopup() {
    this.showPopup = true;
    console.log('Popup affichée.');
  }

  closePopup() {
    this.showPopup = false;
    console.log('Popup fermée.');
  }

  redirectToLogin() {
    this.closePopup();
    this.router.navigate(['/login']);
  }

  redirectToSignup() {
    this.closePopup();
    this.router.navigate(['/signup']);
  }




}
