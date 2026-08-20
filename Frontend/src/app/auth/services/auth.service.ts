import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';



@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl + '/auth';

  private isAuthenticated = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticated.asObservable();
  private last4Digits = new BehaviorSubject<string | null>(null);
  username$ = new BehaviorSubject<string | null>(null);
  private currentUserSubject = new BehaviorSubject<any>(null);
  constructor(private http: HttpClient,private router: Router) {
    const storedUser = localStorage.getItem('user');
    this.currentUserSubject.next(storedUser ? JSON.parse(storedUser) : null);
  }

  signup(name: string, email: string, password: string) {
    return this.http.post(`${this.apiUrl}/signup`, { name, email, password }).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('authToken', res.token);
          localStorage.setItem('username', res.email);
          localStorage.setItem('username', res.username); 
        }
      })
    );
  }

  login(email: string, password: string): Observable<{ token: string, username: string, userId: string }> {
    return this.http.post<{ token: string, username: string, userId: string }>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(response => {
        //console.log('✅ Réponse serveur:', response);

        if (response.token) {
          //console.log('✅ Login successful:', response);

       
          localStorage.setItem('access_token', response.token);

        
          localStorage.setItem('username', response.username);
          this.username$.next(response.username);
          localStorage.setItem('userId', response.userId);
       
          this.isAuthenticated.next(true);

          this.router.navigate(['/acceuil-user']);
        } else {
          console.error('🚨 Aucun token reçu.');
        }
      })
    );
  }



  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(data: { email: string; token: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  // ✅ Sauvegarde du token et du token décodé
  setToken(token: string): void {
  localStorage.setItem('access_token', token);
  try {
    const decodedToken = jwtDecode(token);
    localStorage.setItem('decodedToken', JSON.stringify(decodedToken));
    this.isAuthenticated.next(true);
  } catch (error) {
    console.error('Erreur de décodage du token:', error);
  }
}



// Récupération du token
getToken(): string | null {
  return localStorage.getItem('access_token');
}

// Appel backend pour valider le token
getProfile() {
  const token = this.getToken();
  return this.http.get(`${this.apiUrl}/profile`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}


  setUser(user: any): void {

    localStorage.setItem('user', JSON.stringify(user));
    //console.log('User stored in localStorage:', localStorage.getItem('user'));
  }

  // ✅ Récupération du token décodé
  getDecodedToken(): any {
    const decodedToken = localStorage.getItem('decodedToken');
    return decodedToken ? JSON.parse(decodedToken) : null;
  }

  // ✅ Vérifie si l'utilisateur est authentifié
  isLoggedIn(): boolean {
    const token = this.getToken();
    console.log('🧪 Token lu depuis localStorage:', token);
    if (!token) return false;

    try {
      const decoded: any = jwtDecode(token);
      //console.log('📦 Token décodé:', decoded);
      const now = Math.floor(new Date().getTime() / 1000); // en secondes
     // console.log('🕒 Expiration:', decoded.exp, '| Now:', now);
      return decoded.exp && decoded.exp > now;

    } catch (error) {
      console.error('Token invalide ou corrompu:', error);
      return false;
    }
  }



setCurrentUser(user: any) {
  localStorage.setItem('user', JSON.stringify(user));
  this.currentUserSubject.next(user);
}

logout(): void {
  localStorage.clear();
  this.currentUserSubject.next(null);
  this.isAuthenticated.next(false);
  this.router.navigate(['/acceuil']);
}


getCurrentUser() {
  return this.currentUserSubject.value;
}

getCurrentUserObservable() {
  return this.currentUserSubject.asObservable();
}

// auth.service.ts
getUserId(): string | null {
  const token = this.getToken();
  if (!token) return null;

  try {
    const decoded: any = jwtDecode(token); // Utilisez jwt-decode
    //console.log('Decoded Token:', decoded);
    return decoded.sub; // Ou le champ où vous stockez l'ID utilisateur
  } catch (error) {
   // console.error('Error decoding token:', error);
    return null;
  }
}

loginWithGoogle(googleToken: string): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/google-login`, { token: googleToken }).pipe(
    tap(response => {
      if (response.token) {
        // Store JWT token
        this.setToken(response.token); // Store in localStorage
        localStorage.setItem('username', response.username);
        this.isAuthenticated.next(true);
        this.router.navigate(['/acceuil-user']);
      } else {
        console.error('No token received from server');
      }
    })
  );
}


}

