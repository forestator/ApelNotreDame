import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Tone, TONES } from '../../core/models/tone';
import { uniqueId } from '../../core/utils/unique-id';

/** Choix de la couleur d'une commission ou d'un projet (boutons radio, un nom par couleur). */
@Component({
  selector: 'app-tone-picker',
  imports: [ReactiveFormsModule],
  templateUrl: './tone-picker.html',
  styleUrl: './tone-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TonePicker {
  readonly control = input.required<FormControl<Tone>>();
  readonly legend = input('Couleur');

  protected readonly tones = TONES;
  protected readonly groupName = uniqueId('tone');
}
