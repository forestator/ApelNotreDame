import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith, switchMap } from 'rxjs';
import {
  addDays,
  addMonths,
  dayLabel,
  daysInMonth,
  leadingBlanks,
  monthLabel,
  parseIso,
  toIso,
  WEEKDAYS,
} from '../../core/utils/calendar-math';
import { frenchDateToIso, isoToFrenchDate } from '../../core/utils/french-date';
import { uniqueId } from '../../core/utils/unique-id';

/** Champ date : saisie « jj/mm/aaaa » ou choix dans un petit calendrier (clavier : flèches, PgPréc/PgSuiv, Échap). */
@Component({
  selector: 'app-date-field',
  imports: [ReactiveFormsModule],
  templateUrl: './date-field.html',
  styleUrl: './date-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'closeOnOutsideClick($event)' },
})
export class DateField {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly control = input.required<FormControl<string>>();
  readonly label = input.required<string>();

  private readonly toggleButton = viewChild<ElementRef<HTMLButtonElement>>('toggleButton');
  private readonly textInput = viewChild<ElementRef<HTMLInputElement>>('textInput');

  protected readonly id = uniqueId('date-field');
  protected readonly weekdays = WEEKDAYS;
  protected readonly open = signal(false);

  private readonly now = new Date();
  private readonly todayIso = toIso(this.now.getFullYear(), this.now.getMonth(), this.now.getDate());
  private readonly visible = signal({ year: this.now.getFullYear(), month: this.now.getMonth() });
  private readonly selectedIso = signal<string | null>(null);
  private readonly focusedIso = signal(this.todayIso);

  // Le contrôle n'est pas un signal : on suit son statut pour afficher l'erreur sans appeler de méthode dans le template.
  private readonly status = toSignal(
    toObservable(this.control).pipe(switchMap((control) => control.statusChanges.pipe(startWith(control.status)))),
  );
  protected readonly invalid = computed(() => this.status() === 'INVALID');

  protected readonly monthLabel = computed(() => monthLabel(this.visible().year, this.visible().month));

  protected readonly cells = computed(() => {
    const { year, month } = this.visible();
    const blanks = Array.from({ length: leadingBlanks(year, month) }, (_, index) => ({
      key: `blank-${index}`,
      day: 0,
      iso: '',
      label: '',
      selected: false,
      today: false,
      focusable: false,
    }));
    const days = Array.from({ length: daysInMonth(year, month) }, (_, index) => {
      const day = index + 1;
      const iso = toIso(year, month, day);
      return {
        key: iso,
        day,
        iso,
        label: dayLabel(year, month, day),
        selected: iso === this.selectedIso(),
        today: iso === this.todayIso,
        focusable: iso === this.focusedIso(),
      };
    });
    return [...blanks, ...days];
  });

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    // Le calendrier s'ouvre sur la date saisie si elle est valide, sinon sur aujourd'hui.
    const selected = frenchDateToIso(this.control().value);
    const start = selected ?? this.todayIso;
    const { year, month } = parseIso(start);
    this.selectedIso.set(selected);
    this.visible.set({ year, month });
    this.focusedIso.set(start);
    this.open.set(true);
    this.focusDay(start);
  }

  protected close(): void {
    this.open.set(false);
    this.toggleButton()?.nativeElement.focus();
  }

  protected closeOnOutsideClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  protected pick(iso: string): void {
    const control = this.control();
    control.setValue(isoToFrenchDate(iso));
    control.markAsDirty();
    this.open.set(false);
    this.textInput()?.nativeElement.focus();
  }

  protected clear(): void {
    const control = this.control();
    control.setValue('');
    control.markAsDirty();
    this.open.set(false);
    this.textInput()?.nativeElement.focus();
  }

  protected pickToday(): void {
    this.pick(this.todayIso);
  }

  protected shiftMonth(months: number): void {
    this.moveFocus(addMonths(this.focusedIso(), months), false);
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    const steps: Record<string, () => string> = {
      ArrowLeft: () => addDays(this.focusedIso(), -1),
      ArrowRight: () => addDays(this.focusedIso(), 1),
      ArrowUp: () => addDays(this.focusedIso(), -7),
      ArrowDown: () => addDays(this.focusedIso(), 7),
      PageUp: () => addMonths(this.focusedIso(), -1),
      PageDown: () => addMonths(this.focusedIso(), 1),
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    this.moveFocus(step(), true);
  }

  private moveFocus(iso: string, focusDay: boolean): void {
    const { year, month } = parseIso(iso);
    this.visible.set({ year, month });
    this.focusedIso.set(iso);
    if (focusDay) this.focusDay(iso);
  }

  private focusDay(iso: string): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLButtonElement>(`[data-iso="${iso}"]`)?.focus(),
      { injector: this.injector },
    );
  }
}
