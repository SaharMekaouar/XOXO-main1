import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, tap } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { getApiUrl, probeAndCacheApiUrl } from 'src/app/core/api.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private isAuthenticated = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.isAuthenticated.asObservable();
  username$ = new BehaviorSubject<string | null>(null);
  private currentUserSubject = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient, private router: Router) {
    const storedUser = localStorage.getItem('user');
    this.currentUserSubject.next(storedUser ? JSON.parse(storedUser) : null);
  }

  private get apiUrl() {
    return getApiUrl() + '/auth';
  }

  private withApi<T>(request: () => Observable<T>): Observable<T> {
    return from(probeAndCacheApiUrl()).pipe(switchMap(() => request()));
  }

  private persistSession(response: {
    token?: string;
    username?: string;
    email?: string;
    userId?: string;
  }) {
    if (!response.token) {
      return;
    }
    this.setToken(response.token);
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('access_token', response.token);
    if (response.username || response.email) {
      localStorage.setItem('username', response.username || response.email || '');
      this.username$.next(response.username || response.email || null);
    }
    if (response.userId) {
      localStorage.setItem('userId', response.userId);
    }
    this.isAuthenticated.next(true);
  }

  completeVerification(response: { token?: string; username?: string; email?: string; userId?: string }): void {
    this.persistSession(response);
  }

  signup(name: string, email: string, password: string, phone?: string) {
    return this.withApi(() =>
      this.http.post(`${this.apiUrl}/signup`, { name, email, password, phone }).pipe(
        tap((res: any) => this.persistSession(res))
      )
    );
  }

  login(email: string, password: string): Observable<{ verificationRequired: true; email: string; loginChallenge: string }> {
    return this.withApi(() =>
      this.http.post<{ verificationRequired: true; email: string; loginChallenge: string }>(`${this.apiUrl}/login`, { email, password })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.withApi(() => this.http.post(`${this.apiUrl}/forgot-password`, { email }));
  }

  resetPassword(data: { email: string; token: string; newPassword: string }): Observable<any> {
    return this.withApi(() => this.http.post(`${this.apiUrl}/reset-password`, data));
  }

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

  getToken(): string | null {
    return localStorage.getItem('access_token')
      || localStorage.getItem('authToken')
      || localStorage.getItem('token');
  }

  getProfile() {
    const token = this.getToken();
    return this.withApi(() =>
      this.http.get(`${this.apiUrl}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    );
  }

  setUser(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getDecodedToken(): any {
    const decodedToken = localStorage.getItem('decodedToken');
    return decodedToken ? JSON.parse(decodedToken) : null;
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded: any = jwtDecode(token);
      const now = Math.floor(new Date().getTime() / 1000);
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

  getUserId(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decoded: any = jwtDecode(token);
      return decoded.sub;
    } catch (error) {
      return null;
    }
  }

  loginWithGoogle(googleToken: string): Observable<any> {
    return this.withApi(() =>
      this.http.post<any>(`${this.apiUrl}/google-login`, { token: googleToken }).pipe(
        tap((response) => {
          this.persistSession(response);
          this.router.navigate(['/acceuil-user']);
        })
      )
    );
  }

  sendEmailVerification(email: string, verificationEmail: string, loginChallenge: string): Observable<any> {
    return this.withApi(() =>
      this.http.post(`${getApiUrl()}/verification/send-email`, { email, verificationEmail, loginChallenge })
    );
  }

  verifyEmail(email: string, token: string): Observable<any> {
    return this.withApi(() =>
      this.http.post(`${getApiUrl()}/verification/verify-email`, { email, token })
    );
  }

}
