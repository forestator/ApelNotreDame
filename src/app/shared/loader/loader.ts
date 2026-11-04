import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Indicateur de chargement annoncé aux lecteurs d'écran (role="status"). */
@Component({
  selector: 'app-loader',
  templateUrl: './loader.html',
  styleUrl: './loader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Loader {
  readonly label = input('Chargement…');
}
