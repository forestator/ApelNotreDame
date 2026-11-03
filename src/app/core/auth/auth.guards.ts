import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const approvedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.whenResolved().pipe(
    map((status) => {
      if (status === 'approved') return true;
      return router.createUrlTree([status === 'pending' ? '/en-attente' : '/connexion']);
    }),
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.whenResolved().pipe(map(() => auth.isAdmin() || router.createUrlTree(['/'])));
};

/** Évite d'afficher la page de connexion à quelqu'un déjà connecté. */
export const publicOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.whenResolved().pipe(
    map((status) => {
      if (status === 'approved') return router.createUrlTree(['/']);
      if (status === 'pending') return router.createUrlTree(['/en-attente']);
      return true; // anonymous ou unregistered : la connexion recrée la fiche
    }),
  );
};
