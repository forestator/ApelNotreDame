import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Avancement = tâches terminées / tâches totales. */
@Component({
  selector: 'app-progress',
  templateUrl: './progress.html',
  styleUrl: './progress.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress {
  readonly done = input.required<number>();
  readonly total = input.required<number>();
  readonly label = input.required<string>();

  protected readonly percent = computed(() => (this.total() ? Math.round((this.done() / this.total()) * 100) : 0));
}
