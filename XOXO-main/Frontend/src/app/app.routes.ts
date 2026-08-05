import { Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';
import { StartPage } from './auth/pages/startpage/start.page'; 

export const routes: Routes = [
  { path: '', component: StartPage }, 

  {
    path: 'login',
    loadComponent: () => import('./auth/pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'signup',
    loadComponent: () => import('./auth/pages/signup/signup.page').then(m => m.SignupPage)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./auth/pages/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./auth/pages/reset-password/reset-password.page').then(m => m.ResetPasswordPage)
  },
  {
    path: 'acceuil',
    loadComponent: () => import('./acceuil/acceuil.page').then(m => m.AcceuilPage)
  },
  {
    path: 'acceuil-user',
    loadComponent: () => import('./acceuil-user/acceuil-user.page').then(m => m.AcceuilUserPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'history',
    loadComponent: () => import('./history/history.page').then(m => m.HistoryPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'contact',
    loadComponent: () => import('./contact/contact.page').then(m => m.ContactPage)
  },
  {
    path: 'view',
    loadComponent: () => import('./view/view.page').then(m => m.ViewPage),
    canActivate: [AuthGuard]
  },
];
