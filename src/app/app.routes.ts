import { Routes } from '@angular/router';
import { adminGuard, approvedGuard, publicOnlyGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'connexion',
    canActivate: [publicOnlyGuard],
    loadComponent: () => import('./features/login/login').then((module) => module.Login),
  },
  {
    path: 'en-attente',
    loadComponent: () => import('./features/pending/pending').then((module) => module.Pending),
  },
  {
    path: '',
    canActivate: [approvedGuard],
    loadComponent: () => import('./features/shell/shell').then((module) => module.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/dashboard/dashboard').then((module) => module.Dashboard),
      },
      {
        path: 'profil',
        loadComponent: () => import('./features/profile/profile').then((module) => module.Profile),
      },
      {
        path: 'projets',
        loadComponent: () => import('./features/projects/projects').then((module) => module.Projects),
      },
      {
        path: 'projets/:id',
        loadComponent: () =>
          import('./features/project-detail/project-detail').then((module) => module.ProjectDetail),
      },
      {
        path: 'calendrier',
        loadComponent: () => import('./features/calendar/calendar').then((module) => module.Calendar),
      },
      {
        path: 'membres',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/members/members').then((module) => module.Members),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
