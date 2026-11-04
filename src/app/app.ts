import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { Loader } from './shared/loader/loader';

@Component({
  selector: 'app-root',
  imports: [Loader, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  // Tant que la connexion et la fiche membre ne sont pas résolues, les guards attendent : sans écran de chargement, la page serait blanche.
  protected readonly resolvingSession = computed(() => this.auth.status() === 'loading');

  // Barre fine en haut de page pendant les changements de page (chargement du code de la page).
  protected readonly navigating = toSignal(
    this.router.events.pipe(
      filter(
        (event) =>
          event instanceof NavigationStart ||
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError,
      ),
      map((event) => event instanceof NavigationStart),
    ),
    { initialValue: false },
  );
}
