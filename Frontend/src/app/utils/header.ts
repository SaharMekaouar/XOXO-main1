import { HttpHeaders } from '@angular/common/http';

// Get token from local storage
export const id_token = localStorage.getItem('access_token') || '';

// Default content headers
export const contentHeaders = new HttpHeaders({
  'Accept': 'application/json',
  'Content-Type': 'application/json'
});

// Function to create Authorization header
export function createAuthorizationHeader(): HttpHeaders {
  const token = localStorage.getItem('access_token') || '';
  return new HttpHeaders({
    'ngrok-skip-browser-warning': 'true',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`
  });
}
