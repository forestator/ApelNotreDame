import { NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Avatar } from '../../shared/avatar/avatar';
import { TopBar } from '../../shared/top-bar/top-bar';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  imports: [Avatar, NgOptimizedImage, RouterLink, RouterLinkActive, RouterOutlet, TopBar],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeMenu(true)' },
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly member = this.auth.member;
  protected readonly isAdmin = this.auth.isAdmin;
  // Sur téléphone le menu est un tiroir ; sur grand écran il est toujours affiché et ce signal est sans effet.
  protected readonly menuOpen = signal(false);

  private readonly toggleButton = viewChild.required<ElementRef<HTMLButtonElement>>('toggleButton');
  private readonly side = viewChild.required<ElementRef<HTMLElement>>('side');

  protected toggleMenu(): void {
    if (this.menuOpen()) {
      this.closeMenu(true);
      return;
    }
    this.menuOpen.set(true);
    // Le tiroir est masqué (visibility) tant qu'il est fermé : on attend son affichage pour y placer le focus.
    afterNextRender(() => this.side().nativeElement.querySelector<HTMLElement>('a')?.focus(), {
      injector: this.injector,
    });
  }

  protected closeMenu(restoreFocus = false): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (restoreFocus) this.toggleButton().nativeElement.focus();
  }

  // Un lien du menu mène à une autre page : le tiroir se referme (le focus suit la navigation).
  protected closeOnLink(event: Event): void {
    if ((event.target as HTMLElement).closest('a')) this.closeMenu();
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/connexion');
  }
}
