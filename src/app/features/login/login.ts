import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

// Codes d'erreur Firebase qui ne méritent pas de message : l'utilisateur a lui-même fermé la fenêtre Google.
const SILENT_ERRORS = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

function messageFor(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code ?? '';
  if (SILENT_ERRORS.includes(code)) return null;
  if (code === 'auth/popup-blocked') {
    return 'Votre navigateur a bloqué la fenêtre Google. Autorisez les fenêtres pop-up pour ce site, puis réessayez.';
  }
  if (code === 'auth/unauthorized-domain') return "Cette adresse n'est pas autorisée pour la connexion. Prévenez un administrateur.";
  if (code === 'auth/network-request-failed') return 'Connexion impossible : vérifiez votre accès à Internet.';
  return 'La connexion a échoué. Veuillez réessayer.';
}

@Component({
  selector: 'app-login',
  imports: [NgOptimizedImage],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async signIn(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.signInWithGoogle();
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.error.set(messageFor(error));
    } finally {
      this.busy.set(false);
    }
  }
}
