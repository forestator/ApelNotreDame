import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ViewToggle } from '../view-toggle/view-toggle';

/** Bandeau fin affiché en haut de toutes les pages : salutation et choix de vue. */
@Component({
  selector: 'app-top-bar',
  imports: [ViewToggle],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBar {
  protected readonly member = inject(AuthService).member;
}
