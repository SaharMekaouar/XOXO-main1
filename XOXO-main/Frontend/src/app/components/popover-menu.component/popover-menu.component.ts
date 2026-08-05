import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule,AlertController, PopoverController ,ToastController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { SavedTextService } from 'src/app/auth/services/saved-text.service';
@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  selector: 'app-popover-menu',
  templateUrl: './popover-menu.component.html',
  styleUrls: ['./popover-menu.component.scss']
})
export class PopoverMenuComponent {
  translateMenuOpen = false;
  summarizeMenuOpen = false;
  constructor(private popoverCtrl: PopoverController,  private alertCtrl: AlertController,   private toastController: ToastController,
    private toastCtrl: ToastController,  private http: HttpClient,   private loadingCtrl: LoadingController,  private loadingController: LoadingController,
    private authService: AuthService,
    private savedTextService: SavedTextService,
    private router: Router) {}
    @Input() transcribedText: string = '';
    originalText: string | null = null; 

    ngOnInit() {
      if (!this.transcribedText || this.transcribedText.trim().length === 0) {
        //console.warn('❌ Aucun texte transcrit reçu dans le popover.');
        this.transcribedText = 'No transcribed text available.';
      } else {
        //console.log('✅ Texte transcrit reçu dans le popover :', this.transcribedText);
        this.originalText = this.transcribedText; 
      }
    }


  selectAction(action: string) {
    this.popoverCtrl.dismiss(action);
  }
  toggleSubmenu(menu: string) {
    if (menu === 'translate') {
      this.translateMenuOpen = !this.translateMenuOpen;
      this.summarizeMenuOpen = false;
    } else if (menu === 'summarize') {
      this.summarizeMenuOpen = !this.summarizeMenuOpen;
      this.translateMenuOpen = false;
    }
  }
  isFirstTranslation: boolean = true;
  languages = [
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'Arabic' }
  ];
  loadingMessage: string = 'Loading...';
  selectedLanguage: string = 'fr'; 
  detectedLanguage: string = 'en';
  errorMessage: string = '';
  isLoading: boolean = true;
  translatedText: string | null = null;
  detectLanguage(text: string) {
    this.http.post<any>('https://api.detectlanguage.com/0.2/detect', {
      q: text
    }).subscribe({
      next: (response) => {
        this.detectedLanguage = response.data.detections[0].language;
        //console.log('Detected language:', this.detectedLanguage);
      },
      error: (error) => {
        //console.error('Error detecting language:', error);
        this.detectedLanguage = 'en';
      }
    });
  }
  async presentLoading1() {
    const loading = await this.loadingCtrl.create({
      message: 'Translating...',  
      spinner: 'crescent',  
      cssClass: 'full-page-loading', 
      backdropDismiss: false,  
    });

    await loading.present();  
    return loading; 
  }

  async canTranslate(text: string): Promise<boolean> {
  const wordCount = text.trim().split(/\s+/).length;

  if ( wordCount <= 400) {
    return true;
  } else {
    const toast = await this.toastController.create({
      message: ' Please do Summarize first (text must be between 200 and 400 words)',
      duration: 3000,
      color: 'warning',
      //position: 'top'
    });
    await toast.present();
    return false;
  }
}
 async  translateText(text: string, targetLang: string) {
      const canTranslate = await this.canTranslate(text);
  if (!this.canTranslate(text)) return;
  if (!canTranslate) return;
    console.log('👉 Translating text:', text, 'to:', targetLang);
    if (!text || !targetLang) return;
    this.originalText = text; 
    this.isLoading = true;
    this.loadingMessage = 'Translating...';
    this.presentLoading1().then((loading) => {
      this.http.post<any>('https://ff3a-154-111-224-232.ngrok-free.app/translate/', {
        text: this.originalText,

        src_lang: this.detectedLanguage, 
        tgt_lang: targetLang
      }).subscribe({
        next: (response) => {
          console.log('✅ Translation received:', response);
          this.transcribedText = response.translation;
          this.isLoading = false;
          loading.dismiss(); 
        },
        error: (error) => {
          console.error('❌ Error translating:', error);
          this.errorMessage = 'Error translating.';
          this.isLoading = false;
          loading.dismiss();
        }
      });
    });
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'primary',
      //position: 'top'
    });
    toast.present();
  }
  sendEmail(to: string, subject: string) {
    const finalText = this.originalText || this.transcribedText;
    console.log('📩 Texte à envoyer par mail :', finalText);
    if (!finalText || finalText.trim().length === 0 || finalText === 'No transcribed text available.') {
      this.showToast(' No text available to send.');
      return;
    }
    const payload = {
      to,
      subject,
      text: finalText
    };
    this.http.post('https://714e-154-111-224-232.ngrok-free.app/mail/send', payload).subscribe({
      next: () => {
        this.showToast(' Email sent successfully !');
      },
      error: (error) => {
        console.error('❌ Erreur lors de l’envoi du mail :', error);
        this.showToast('Error sending email.');
      },
    });
  }
async saveCurrentText() {
  const content = this.translatedText || this.transcribedText;
  if (!content) {
    const toast = await this.toastController.create({
      message: 'No text to save!',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
    return;
  }
  const userId = this.authService.getUserId();
  if (!userId) {
    const toast = await this.toastController.create({
      message: 'Please login to save texts',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
    return;
  }
  const loading = await this.loadingController.create({
    message: 'Saving...'
  });
  await loading.present();

  try {
    await firstValueFrom(this.savedTextService.saveText({
      userId: userId,
      content: content
    }));
    const toast = await this.toastController.create({
      message: 'Text saved successfully!',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
    this.router.navigate(['/history']);
  } catch (error: unknown) {
    console.error('Save error:', error);
    let errorMessage = 'Failed to save text';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    const toast = await this.toastController.create({
      message: errorMessage,
      duration: 3000,
      color: 'danger'
    });
    await toast.present();
  } finally {
    await loading.dismiss();
  }
}
  async openEmailModal() {
    const alert = await this.alertCtrl.create({
      header: 'Share via mail',
      inputs: [
        {
          name: 'to',
          type: 'email',
          placeholder:" Recipient's email address"
        },
        {
          name: 'subject',
          type: 'text',
          placeholder: 'Title'
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Send',
          handler: data => {
            this.sendEmail(data.to, data.subject); 
          }
        }
      ]
    });

    await alert.present();
  }
  showShareOptions = false;

toggleShareOptions() {
  this.showShareOptions = !this.showShareOptions;
}
  translateAndReset(text: string, targetLang: string) {
    if (!this.originalText) {
      this.originalText = this.transcribedText; 
    }
    if (this.isFirstTranslation) {
      this.isFirstTranslation = false;  
    } else {
     
      this.translatedText = null;  
    }
    this.transcribedText = this.originalText;
    console.log('Text has been reset to transcribed (original):', this.transcribedText);
    this.translateText(this.transcribedText, targetLang);
  }
}
