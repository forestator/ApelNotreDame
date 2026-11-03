import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Photo de profil, ou initiale du nom à défaut. */
@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly photoUrl = input<string | null>();
  readonly small = input(false);
  readonly light = input(false);

  protected readonly initial = computed(() => this.name().charAt(0).toUpperCase());
}
