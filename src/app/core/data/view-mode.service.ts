import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'task-view-condensed';

/** Choix « condensée / détaillée », partagé entre l'accueil et les projets et retenu d'une visite à l'autre. */
@Injectable({ providedIn: 'root' })
export class ViewModeService {
  readonly condensed = signal(this.read());

  set(condensed: boolean): void {
    this.condensed.set(condensed);
    try {
      localStorage.setItem(STORAGE_KEY, String(condensed));
    } catch {
      // Stockage indisponible (navigation privée…) : le choix vaut simplement pour la session.
    }
  }

  private read(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  }
}
