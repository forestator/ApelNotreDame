import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-pending',
  templateUrl: './pending.html',
  styleUrl: './pending.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pending {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const status = this.auth.status();
      if (status === 'approved') void this.router.navigateByUrl('/');
      if (status === 'anonymous' || status === 'unregistered') void this.router.navigateByUrl('/connexion');
    });
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/connexion');
  }
}
