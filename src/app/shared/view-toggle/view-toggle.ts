import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ViewModeService } from '../../core/data/view-mode.service';

@Component({
  selector: 'app-view-toggle',
  templateUrl: './view-toggle.html',
  styleUrl: './view-toggle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewToggle {
  // Variante pour un fond coloré (bandeau de l'accueil), sans marge basse.
  readonly inline = input(false);

  protected readonly viewMode = inject(ViewModeService);
}
