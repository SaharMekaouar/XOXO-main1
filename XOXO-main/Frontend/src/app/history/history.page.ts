import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../auth/services/auth.service';
import { SavedTextService } from '../auth/services/saved-text.service';
import { lastValueFrom } from 'rxjs';
import { FormGroup, FormBuilder } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { Subject ,firstValueFrom} from 'rxjs';
import { Component, OnInit, ElementRef, HostListener, ViewChildren, QueryList } from '@angular/core';
import { PopoverMenuComponent } from '../components/popover-menu.component/popover-menu.component';
import { HttpClient } from '@angular/common/http';
import { AlertController, PopoverController } from '@ionic/angular';
import { ClickOutsideDirective } from '../directives/click-outside.directive';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import jsPDF from 'jspdf';
import { Navbar } from "../navbar/navbar";
import { Filesystem, Directory,Encoding  } from '@capacitor/filesystem';
interface Clip {
  id: string;
  title: string;
  content?: string;
  createdAt?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  userId: string;
}
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule, Navbar],

  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({
        maxHeight: '4.5em',
        overflow: 'hidden'
      })),
      state('expanded', style({
        maxHeight: '1000px',
        overflow: 'auto'
      })),
      transition('collapsed <=> expanded', [
        animate('300ms ease-in-out')
      ])
    ])
  ]
})


export class HistoryPage implements OnInit {

filteredClips: any[] = [];
  loadingMessage: string = 'Loading...';
  searchTerm: string = '';
  userName: string = '';
  clips: any[] = [];
  transcribedText: string = '';
  translatedText: string = '';
  isLoading = false;
  form = { title: '', content: '' };
  private autoSaveSubject = new Subject<void>();
  showOnlyFavorites = false;

  categories: any[] = [];
  selectedCategory: string | null = null;
  newCategoryName: string = '';
  showCategoryModal: boolean = false;
  editingCategory: any = null;
  noSavedText: boolean = false;
  constructor(private router: Router,
    private alertCtrl: AlertController,
    private toastController: ToastController,
    private authService: AuthService,
    private savedTextService: SavedTextService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private fb: FormBuilder,
    private http: HttpClient, // Add this
    private alertController: AlertController, // Add this
    private popoverCtrl: PopoverController) {}
  uploadedFileName: string = '';
  expandedClipIds: Set<string> = new Set();
  editingClipId: string | null = null;
  uploadedFile: File | null = null;
  mediaUrl: string = '';
  isAuthenticated = false;
  username: string | null = null;
   originalText: string | null = null;
  showLogout = false; // Contrôle direct de la visibilité
  async ngOnInit() {

    this.isAuthenticated = this.authService.isLoggedIn();
    console.log('🔐 Authenticated:', this.isAuthenticated);
    this.authService.username$.subscribe(digits => this.username = digits);
    this.username = localStorage.getItem('username');
    const user = localStorage.getItem('user');
    const userId = this.authService.getUserId();
    if (user) {
      this.userName = JSON.parse(user).name;
    }

    if (this.isAuthenticated) {
      await this.loadSavedTexts();
      await this.loadCategories();
    }
       // Appliquer un délai de 1 seconde avant de sauvegarder pour éviter de spammer l'API
       this.autoSaveSubject.pipe(debounceTime(1000)).subscribe(() => {
        this.autoSave();
      });

      // Charger les valeurs actuelles
      if (this.clips.length > 0) {
        this.form.title = this.clips[0].title;
        this.form.content = this.clips[0].content;
      }
  }
  //TOAST FOR SUCCESS
  async presentToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

    // Fonction d'auto-save qui envoie les modifications à l'API
    async autoSave() {
      try {
        if (this.clips.length === 0) return;

        const formValue = this.form;
        if (formValue.title) {
          await this.updateTitle(this.clips[0].id, formValue.title);
        }
        if (formValue.content) {
          await this.updateContent(this.clips[0].id, formValue.content);
        }
      } catch (error) {
        console.error('Error during auto-save:', error);
      }

    }

    triggerAutoSave() {
      this.autoSaveSubject.next();
    }


async updateContent(id: string, newContent: string) {
  try {
    const updatedClip = await firstValueFrom(
      this.savedTextService.updateSavedText(id, { content: newContent })
    );

    this.clips = this.clips.map(clip =>
      clip.id === id ? { ...clip, content: updatedClip.content } : clip
    );

    const toast = await this.toastCtrl.create({
      message: 'Text updated successfully!',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  } catch (error) {
    console.error('Error updating content:', error);
    const toast = await this.toastCtrl.create({
      message: 'Failed to update content',
      duration: 2000,
      color: 'danger',
    });
    await toast.present();
  }
}
async updateTitle(id: string, newTitle: string) {
      // Validation simple
      if (!newTitle || newTitle.trim().length === 0) {
        const toast = await this.toastCtrl.create({
          message: 'The title cannot be empty.',
          duration: 2000,
          color: 'warning'
        });
        await toast.present();
        return;
      }

      const loading = await this.loadingCtrl.create({
        message: 'Updating title...'
      });
      await loading.present();

      // Trouver l'index et sauvegarder l'ancien titre
      const clipIndex = this.clips.findIndex(c => c.id === id);
      const oldTitle = clipIndex > -1 ? this.clips[clipIndex].title : '';

      try {
        // Mise à jour optimiste de l'UI
        if (clipIndex > -1) {
          this.clips[clipIndex].title = newTitle;
          this.filteredClips = [...this.clips];
        }

        // Appel API
        const updatedClip = await lastValueFrom(
          this.savedTextService.updateSavedText(id, { title: newTitle })
        );

        // Mise à jour avec la réponse du serveur
        if (clipIndex > -1) {
          this.clips[clipIndex] = { ...this.clips[clipIndex], ...updatedClip };
          this.filteredClips = [...this.clips];
        }

        const toast = await this.toastCtrl.create({
          message: 'Title updated successfully!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();

      } catch (error) {
        console.error('Error updating title:', error);

        // Revert UI en cas d'erreur
        if (clipIndex > -1) {
          this.clips[clipIndex].title = oldTitle;
          this.filteredClips = [...this.clips];
        }

        let errorMessage = 'Error updating title';
        if (error instanceof Error) {
          errorMessage = error.message.includes('401')
            ? 'Session expirée. Veuillez vous reconnecter.'
            : error.message;
        }

        const toast = await this.toastCtrl.create({
          message: errorMessage,
          duration: 3000,
          color: 'danger'
        });
        await toast.present();

        // Déconnexion si token invalide
        if (errorMessage.includes('401')) {
          this.authService.logout();
        }
      } finally {
        await loading.dismiss();
      }
    }
    async updateContentAutoSave(textId: string, newContent: string) {
      // Validation
      if (!newContent || newContent.trim().length === 0) {
        const toast = await this.toastCtrl.create({
          message: 'Content cannot be empty',
          duration: 2000,
          color: 'warning'
        });
        await toast.present();
        return;
      }

      const clipIndex = this.clips.findIndex(c => c.id === textId);
      const oldContent = clipIndex > -1 ? this.clips[clipIndex].transcription : '';

      // Optimistic update
      if (clipIndex > -1) {
        this.clips[clipIndex].transcription = newContent;
        this.filteredClips = [...this.clips];
      }

      try {
        const updatedClip = await lastValueFrom(
          this.savedTextService.updateTextContent(textId, newContent)
        );

        if (clipIndex > -1) {
          this.clips[clipIndex] = { ...this.clips[clipIndex], ...updatedClip };
          this.filteredClips = [...this.clips];
        }

        const toast = await this.toastCtrl.create({
          message: '✅Content updated successfully!',
          duration: 2000,
          color: 'success'
        });
        await toast.present();

      } catch (error) {
        // Revert changes
        if (clipIndex > -1) {
          this.clips[clipIndex].transcription = oldContent;
          this.filteredClips = [...this.clips];
        }

        let errorMessage = '❌ Error while updating the text.';
        if (error instanceof Error) {
          errorMessage = error.message.includes('401')
            ? 'Session expirée. Veuillez vous reconnecter.'
            : error.message;
        }

        const toast = await this.toastCtrl.create({
          message: errorMessage,
          duration: 3000,
          color: 'danger'
        });
        await toast.present();

        if (errorMessage.includes('401')) {
          this.authService.logout();
        }
      }
    }



 //selectedClip: any = null;
 isClipOpen = true;

 close() {
   this.isClipOpen = false;
 }

 toggleClip(clip: Clip) {
  if (this.editingClipId === clip.id) {
    this.editingClipId = null; // Ferme si déjà ouvert
  } else {
    this.editingClipId = clip.id; // Ouvre ce clip en mode édition
  }
}

closeClip(id: string) {
  console.log('Clicked outside, closing clip with id:', id);
  if (this.editingClipId === id) {
    this.editingClipId = null;
  }
  // Fermer aussi le texte étendu
  if (this.selectedClipId === id) {
    this.selectedClipId = null;
  }
}

isClipExpanded(clip: Clip): boolean {
  return this.expandedClipIds.has(clip.id);
}
isEditing(clip: Clip): boolean {
  return this.editingClipId === clip.id;
}
editClip(clipId: string) {
  this.editingClipId = clipId;
}
isExpanded: { [key: string]: boolean } = {};
expandText(clipId: string) {
  this.isExpanded[clipId] = true;
}
//Pour fermer le clip étendu lors du clic à l'extérieur
@ViewChildren('clipCard') clipCards!: QueryList<ElementRef>;

@HostListener('document:click', ['$event'])
handleClick(event: MouseEvent) {
  let clickedInside = false;

  this.clipCards.forEach((cardRef) => {
    if (cardRef.nativeElement.contains(event.target)) {
      clickedInside = true;
    }
  });

  if (!clickedInside) {
    this.editingClipId = null;
    this.selectedClipId = null;
  }
}



    async loadSavedTexts() {
      this.isLoading = true;
      const loading = await this.loadingCtrl.create({
        message: 'LOADING.....'
      });
      await loading.present();

      try {
        const userId = this.authService.getUserId();
        if (!userId) {
          throw new Error('User ID not available.');
        }

        const response = await lastValueFrom(
          this.savedTextService.getSavedTexts(userId)
        );

        console.log('API Response:', response);
        this.clips = Array.isArray(response) ? response : [];
        this.filteredClips = [...this.clips];
        this.noSavedText = this.clips.length === 0;
      } catch (error) {
        console.error('Erreur:', error);



      } finally {
        loading.dismiss();
        this.isLoading = false;
      }

    }


    async deleteText(id: string, event: Event) {
  event.stopPropagation();
  const loading = await this.loadingCtrl.create({
    message: 'Deleting...'
  });
  await loading.present();

  try {
    await lastValueFrom(this.savedTextService.deleteSavedText(id));
    // Local update
    this.clips = this.clips.filter(clip => clip.id !== id);
    this.filteredClips = [...this.clips];

    const toast = await this.toastCtrl.create({
      message: '✅ Clip deleted successfully.',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  } catch (error) {
    console.error('Error while deleting the clip:', error);
    const toast = await this.toastCtrl.create({
      message: '❌ Failed to delete the clip.',
      duration: 3000,
      color: 'danger'
    });
    await toast.present();
  } finally {
    await loading.dismiss();
  }
}


    filterClips() {
      this.filteredClips = this.clips.filter(clip => {
        const matchesSearch = !this.searchTerm ||
          clip.title?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          clip.content?.toLowerCase().includes(this.searchTerm.toLowerCase());

        const matchesCategory = this.selectedCategory === null || clip.categoryId === this.selectedCategory;

        const matchesFavorite = !this.showOnlyFavorites || clip.isFavorite;

        return matchesSearch && matchesCategory && matchesFavorite;
      });
    }




  loadMore() {
    this.clips.push(...this.clips);
    this.filterClips();
  }

  Contact() {
    this.router.navigate(['/contact']);
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
    const urlInput = document.getElementById('urlInput') as HTMLInputElement;
    if (urlInput) {
      urlInput.value = ''; // Réinitialisation de l'élément HTML input URL
    }

    this.router.navigate(['/acceuil']);
  }
  History() {
    this.router.navigate(['/history']);
  }
  logout() {
    this.authService.logout();
    this.isAuthenticated = false;
    this.username = null;
    this.router.navigate(['/']); // Redirection après déconnexion
    this.showLogout = false; // Cache avant action
  }

  signup() {
    // Déconnexion de l'utilisateur (peut être améliorée avec JWT plus tard)

    this.router.navigate(['signup']);
  }
  login() {
    this.router.navigate(['login']);
}
selectedClip: any = null;

selectClip(clip: any) {
  this.selectedClip = clip;
}

closeDetails() {
  this.selectedClip = null;
}

async toggleFavorite(clip: Clip) {
  try {
    const updatedClip = await lastValueFrom(
      this.savedTextService.toggleFavorite(clip.id, !clip.isFavorite)
    );

    // Mise à jour locale
    this.clips = this.clips.map(c =>
      c.id === clip.id ? { ...c, isFavorite: updatedClip.isFavorite } : c
    );
    this.filteredClips = [...this.clips];

    const toast = await this.toastCtrl.create({
      message: updatedClip.isFavorite ? 'Added to favorites. ❤️' : 'Removed from favorites.',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  } catch (error) {
   // console.error('Erreur de mise à jour des favoris:', error);
    const toast = await this.toastCtrl.create({
      message: 'Error while updating favorites.',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
  }
}
getFirstLetter(name: string | undefined | null): string {
  return name ? name.charAt(0).toUpperCase() : '';
}
onCategoryChange(clip: any) {
  if (clip.categoryId === 'none') {
    clip.categoryId = null;
    this.removeFromCategory(clip.id);
  } else {
    this.assignToCategory(clip.id, clip.categoryId);
  }
}
async loadCategories() {
  try {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.categories = await lastValueFrom(
      this.savedTextService.getUserCategories(userId)
    );
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}
async createCategory() {
  if (!this.newCategoryName.trim()) return;

  try {
    const userId = this.authService.getUserId();
    if (!userId) return;
    const existing = this.categories.find(
      (cat) => cat.name.toLowerCase().trim() === this.newCategoryName.toLowerCase().trim()
    );

    if (existing) {
      this.showToast('Category name already exists.', 'danger');
      return;
    }
    await lastValueFrom(
      this.savedTextService.createCategory(this.newCategoryName, userId)
    );

    this.newCategoryName = '';
    await this.loadCategories();
    this.showToast('Category created successfully.', 'success');
  } catch (error) {
    //console.error('Error creating category:', error);
    this.showToast('An error occurred while creating the category.', 'danger');
  }
}


async assignToCategory(textId: string, categoryId: string) {
  try {
    await lastValueFrom(
      this.savedTextService.assignCategoryToText(textId, categoryId)
    );
    await this.loadSavedTexts();
  } catch (error) {
    console.error('Error assigning category:', error);
  }
}

async removeFromCategory(textId: string) {
  try {
    await lastValueFrom(
      this.savedTextService.removeCategoryFromText(textId)
    );
    this.showToast('Category removed from the text successfully.', 'success');
    await this.loadSavedTexts();
  } catch (error) {
    //console.error('Error removing category:', error);
    this.showToast('An error occurred while removing the category.', 'danger');
  }
}

async showToast(message: string, color: 'success' | 'danger' = 'success') {
  const toast = await this.toastController.create({
    message,
    duration: 2000,
    color,
    position: 'bottom',
  });
  await toast.present();
}
async updateCategory(category: any) {
  try {

    const nameAlreadyUsed = this.categories.some(
      (cat) =>
        cat.id !== category.id &&
        cat.name.toLowerCase().trim() === category.name.toLowerCase().trim()
    );

    if (nameAlreadyUsed) {
      this.showToast('Category name already exists.', 'danger');
      return;
    }

    await lastValueFrom(
      this.savedTextService.updateCategory(category.id, category.name)
    );
    this.editingCategory = null;
    await this.loadCategories();
    this.showToast('Category updated successfully.', 'success');
  } catch (error) {
    //console.error('Error updating category:', error);
    this.showToast('An error occurred while updating the category.', 'danger');
  }
}


async deleteCategory(categoryId: string) {
  const alert = await this.alertController.create({
    header: 'Confirm Deletion',
    message: 'Are you sure you want to delete this category? This action is irreversible.',
    buttons: [
      {
        text: 'Cancel',
        role: 'cancel',
        cssClass: 'secondary',
        handler: () => {
         // console.log('Deletion cancelled');
        }
      },
      {
        text: 'Delete',
        handler: async () => {
          try {
            await lastValueFrom(
              this.savedTextService.deleteCategory(categoryId)
            );
            await this.loadCategories();
            await this.loadSavedTexts();
            this.showToast('Category deleted successfully.', 'success');
          } catch (error) {
            //console.error('Error deleting category:', error);
            this.showToast('An error occurred while deleting the category.', 'danger');
          }
        }
      }
    ]
  });

  await alert.present();
}
filterByCategory(categoryId: string | null) {
  this.selectedCategory = categoryId;
  this.applyFilters();
}

toggleFavoriteFilter() {
  this.showOnlyFavorites = !this.showOnlyFavorites;
  this.filterClips(); 

}

selectedClipId: string | null = null;


expandClip(clip: any) {
  clip.isExpanded = true;
}

collapseClip(clip: any) {
  clip.isExpanded = false;
  if (this.editingClipId === clip.id) {
    this.editingClipId = null;
  }
}

enableEditing(clip: any) {
  clip.isExpanded = true;
  this.editingClipId = clip.id;
}

UpdateContent(textId: string, newContent: string) {
  this.savedTextService.updateTextContent(textId, newContent).subscribe({
    next: (res) => {
     // console.log("Contenu mis à jour :", res);
      this.loadSavedTexts(); 
    },
    error: (err) => {
      console.error("Erreur lors de la mise à jour :", err);
    }
  });
}

collapseAndClose(clip: any) {
  clip.isExpanded = false;
  this.editingClipId = null;
}

  expandAndEdit(clip: any) {
    clip.isExpanded = true;
    this.editingClipId = clip.id;
  }
expandedClipId: string | null = null;

ExpandText(clip: any) {
  clip.isExpanded = true;
  this.expandedClipId = clip.id;  
}

UnCollapseText(clip: any) {
  clip.isExpanded = false;}

startEditing(clip: any) {
  this.editingClipId = clip.id;  
  this.expandedClipId = null; 
}

async ShowToast(message: string, color: string = 'success') {
  const toast = await this.toastController.create({
    message,
    duration: 2000,
    color,
    position: 'bottom'
  });
  toast.present();
}
sendEmail(to: string, subject: string, text: string) {
  if (!text || text.trim().length === 0 || text === 'Aucun texte transcrit disponible.') {
    this.showToast(' No text available to send.');
    return;
  }

  const payload = {
    to,
    subject,
    text
  };

  this.http.post('https://714e-154-111-224-232.ngrok-free.app/mail/send', payload).subscribe({
    next: () => {
      this.showToast(' Mail sent successfully !');
    },
    error: (error) => {
      //console.error('❌ Erreur lors de l’envoi du mail :', error);
      this.showToast('Eerror sending email.');
    },
  });
}

async PresentLoading() {
  const loading = await this.loadingCtrl.create({
    message: this.loadingMessage, 
    spinner: 'crescent', 
    backdropDismiss: false, 
  });

  await loading.present();  
  return loading;  
}


async PresentPopover() {
  const popover = await this.popoverCtrl.create({
    component: PopoverMenuComponent,
    componentProps: {
      transcribedText: this.transcribedText 
    },
    translucent: true,
  });

  await popover.present();
}

// Modal method
openModal() {
  const payload = {
    type: this.translatedText ? 'translation' : 'transcription',
    text: this.translatedText || this.transcribedText,
  };

  this.http.post<any>('https://714e-154-111-224-232.ngrok-free.app/text/generate-url', payload).subscribe(
    (res) => {
      const shareableUrl = res.url;

      this.showAlert('Shareable Link', shareableUrl);
    },
    (error) => {
      console.error('Error generating the link.', error);
      this.showAlert('Erreur', 'Unable to generate the link.');
    }
  );
}


async showAlert(title: string, message: string) {
  const alert = await this.alertController.create({
    header: title,
    message: `${message}`,
    buttons: [
      {
        text: 'Copy',
        handler: () => {
          navigator.clipboard.writeText(message);
        },
      },
      {
        text: 'OK',
        role: 'cancel'
      }
    ],
    mode: 'ios'
  });
  await alert.present();
}
setTranscribedText(text: string) {
  this.transcribedText = text;
}

setTranslatedText(text: string) {
  this.translatedText = text;
}
async shareTextOrGenerateLink(text: string) {
  if (!text) {
    this.presentToast('No text to share', 'danger');
    return;
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Text from Recapify',
        text: text,
      });
    } catch (err) {
      console.log('Share cancelled', err);
    }
  }

  else {
    this.transcribedText = text; 
    this.openModal(); 
  }
}

texts: any[] = [];
showOnlyPinned: boolean = false;
applyFilters() {
  let filtered = [...this.clips];


  if (this.selectedCategory !== null) {
    filtered = filtered.filter(clip => clip.categoryId === this.selectedCategory);
  }

 
  if (this.showOnlyFavorites) {
    filtered = filtered.filter(clip => clip.isFavorite === true);
  }

 
  if (this.showOnlyPinned) {
    filtered = filtered.filter(clip => clip.isPinned === true);
  }

  
  if (!this.showOnlyFavorites && !this.showOnlyPinned) {
    filtered = filtered.sort((a, b) => {
      if (a.isPinned === b.isPinned) return 0;
      return a.isPinned ? -1 : 1; 
    });
  }

  this.filteredClips = filtered;
}


resetFilters() {
  this.selectedCategory = null;
  this.showOnlyPinned = false;
  this.applyFilters();
}

togglePinnedFilter() {
  this.showOnlyPinned = !this.showOnlyPinned;
  this.applyFilters();
}
ionViewWillEnter() {
  this.loadSavedTexts();
}
FilterClips() {
  const search = this.searchTerm.toLowerCase();
  this.filteredClips = this.clips
    .filter(clip =>
      clip.title.toLowerCase().includes(search) ||
      clip.content.toLowerCase().includes(search)
    )
  
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); 
    });

  if (this.showOnlyFavorites) {
    this.filteredClips = this.filteredClips.filter(clip => clip.isFavorite);
  }

  if (this.showOnlyPinned) {
    this.filteredClips = this.filteredClips.filter(clip => clip.isPinned);
  }

  if (this.selectedCategory !== null) {
    this.filteredClips = this.filteredClips.filter(clip => clip.categoryId === this.selectedCategory);
  }
}
async togglePin(clip: Clip) {
  try {
   
    const response = await lastValueFrom(
      this.savedTextService.updatePinStatus(clip.id, !clip.isPinned)
    );

    const updatedIsPinned = response?.isPinned ?? !clip.isPinned;

   
    this.clips = this.clips.map(c =>
      c.id === clip.id ? { ...c, isPinned: updatedIsPinned } : c
    );

   
    this.FilterClips();

  
    const toast = await this.toastCtrl.create({
      message: updatedIsPinned ? 'Pinned text. 📌' : 'Unpinned text.',
      duration: 2000,
      color: updatedIsPinned ? 'success' : 'danger'
    });
    await toast.present();
  } catch (error) {
   // console.error('Erreur lors de la mise à jour de l\'épinglage:', error);
    const toast = await this.toastCtrl.create({
      message: 'Error while updating the pinning.',
      duration: 2000,
      color: 'danger'
    });
    await toast.present();
  }
}
selectAction(action: string, clip?: any) {
  if (action === 'download' && clip) {
    this.generatePDF(clip);
  }
}

async generatePDF(clip: any) {
  const doc = new jsPDF();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Transcription', 105, 15, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);

  const marginLeft = 10;
  const marginTop = 30;
  const pageWidth = doc.internal.pageSize.width - 2 * marginLeft;

  const content = clip.content || '';
  const splitText = doc.splitTextToSize(content, pageWidth);
  doc.text(splitText, marginLeft, marginTop);

  
  const now = new Date();
  const timestamp = now.getFullYear().toString() + '.'+
                    (now.getMonth() + 1).toString().padStart(2, '0') +'.'+
                    now.getDate().toString().padStart(2, '0') ;

  const fileName = `transcription_${timestamp}.pdf`;

  const base64Data = doc.output('dataurlstring').split(',')[1];

  try {
    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Documents,
    });
    alert(`PDF saved: ${fileName}`);
  } catch (e) {
    //console.error('PDF save error:', e);
    alert('Error saving PDF.');
  }
}


showShareOptions = false;

toggleShareOptions() {
  this.showShareOptions = !this.showShareOptions;
}
async openEmailModal(clipText: string) {
  const alert = await this.alertCtrl.create({
    header: 'Partager par mail',
    inputs: [
      {
        name: 'to',
        type: 'email',
        placeholder: 'Adresse e-mail du destinataire'
      },
      {
        name: 'subject',
        type: 'text',
        placeholder: 'Titre du message'
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
          this.sendEmail(data.to, data.subject, clipText)
        }
      }
    ]
  });

  await alert.present();
}

}
