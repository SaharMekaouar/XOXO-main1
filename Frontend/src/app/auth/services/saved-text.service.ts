import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { createAuthorizationHeader } from 'src/app/utils/header';

@Injectable({
  providedIn: 'root'
})
export class SavedTextService {
  //private baseUrl = `${environment.apiUrl}/saved-text`;
  private baseUrl = 'https://714e-154-111-224-232.ngrok-free.app/saved-text';
  private categoryUrl = 'https://714e-154-111-224-232.ngrok-free.app/categories';
  constructor(private http: HttpClient,private authService: AuthService) {}

  private getRequestOptions() {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('No token available');
    }

    return {
      headers: new HttpHeaders({
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }),

    };
  }

  saveText(data: { userId: string, content: string }): Observable<any> {
    const options = createAuthorizationHeader();
   // console.log('Sending to:', this.baseUrl, 'Data:', data,'Request headers:', options);
    return this.http.post(this.baseUrl, data, {headers: options}).pipe(
      catchError(this.handleError)
    );
  }
  updateTextContent(id: string, content: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}`, { content }, this.getRequestOptions());
  }
  getSavedTexts(userId: string): Observable<any> {
    const options = createAuthorizationHeader();
    //console.log('Request options:', options);
    return this.http.get(`${this.baseUrl}/${userId}`, {headers: options}).pipe(
      catchError(this.handleError)
    );
  }
  deleteSavedText(id: string): Observable<any> {
    const options = createAuthorizationHeader();
    //console.log('Delete request options:', options);
    return this.http.delete(`${this.baseUrl}/${id}`, {headers: options}).pipe(
      catchError(this.handleError) );
  }
  private handleError(error: HttpErrorResponse) {
    //console.error('API Error:', error);
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) { errorMessage = `Client-side error: ${error.error.message}`;
    } else {  errorMessage = `Server-side error: ${error.status} ${error.message}`; }
    return throwError(() => new Error(errorMessage));
  }
  updateSavedText(id: string, data: { title?: string; content?: string }): Observable<any> {
    const options = this.getRequestOptions();
    //console.log('Update request options:', options);
    return this.http.patch(`${this.baseUrl}/${id}`, data, options).pipe(   catchError(this.handleError) );
  }
  toggleFavorite(id: string, isFavorite: boolean): Observable<any> {
    const options = this.getRequestOptions();
    return this.http.patch(`${this.baseUrl}/${id}/favorite`, { isFavorite }, options);
  }
  getFavorites(userId: string): Observable<any[]> {
    const options = this.getRequestOptions();
    return this.http.get<any[]>(`${this.baseUrl}/${userId}/favorites`, options);
  }
  assignCategoryToText(textId: string, categoryId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${textId}/assign-category/${categoryId}`, {}, this.getRequestOptions());
  }
  removeCategoryFromText(textId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${textId}/remove-category`, {}, this.getRequestOptions());
  }
  changeCategory(textId: string, newCategoryId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${textId}/change-category/${newCategoryId}`, {}, this.getRequestOptions());
  }
  createCategory(name: string, userId: string): Observable<any> {
    const header = createAuthorizationHeader();
    return this.http.post(this.categoryUrl, { name, userId }, {headers: header});
  }
  getUserCategories(userId: string): Observable<any> {
    const header = createAuthorizationHeader();
    return this.http.get(`${this.categoryUrl}/${userId}`, {headers: header}).pipe( catchError(this.handleError));
  }
  updateCategory(id: string, name: string): Observable<any> {
    return this.http.patch(`${this.categoryUrl}/${id}`, { name }, this.getRequestOptions());
  }
  deleteCategory(id: string): Observable<any> {
    return this.http.delete(`${this.categoryUrl}/${id}`, this.getRequestOptions());
  }
   getAllTexts(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${userId}`,this.getRequestOptions());
  }
  getPinnedTexts(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/pinned/${userId}`,this.getRequestOptions());
  }
  updatePinStatus(id: string, isPinned: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/pin/${id}`, { isPinned },this.getRequestOptions());
  }
}
