import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { MemberService } from '../../core/data/member.service';
import { TaskService } from '../../core/data/task.service';
import { headcount, isFull, missingPeople, Task } from '../../core/models/task';
import { longDayLabel, todayIso } from '../../core/utils/calendar-math';
import { formatTime } from '../../core/utils/french-time';

/** Une ligne compacte par créneau, pour voir d'un coup d'œil ce qui est rempli dans une activité. */
@Component({
  selector: 'app-task-slot',
  templateUrl: './task-slot.html',
  styleUrl: './task-slot.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskSlot {
  private readonly auth = inject(AuthService);
  private readonly taskService = inject(TaskService);
  private readonly memberService = inject(MemberService);
  private readonly today = todayIso();

  readonly task = input.required<Task>();
  // Nom de l'activité regroupant les créneaux : le titre de la tâche n'est rappelé que s'il apporte une précision.
  readonly activity = input('');

  // Prévient la liste avant l'écriture, comme TaskItem, pour qu'elle garde la ligne en place.
  readonly registrationToggled = output<void>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly when = computed(() =>
    [
      this.task().date ? longDayLabel(this.task().date as string) : 'Date à confirmer',
      formatTime(this.task().time),
    ]
      .filter(Boolean)
      .join(' · '),
  );
  protected readonly label = computed(() => {
    const title = this.task().title.trim();
    return title.toLocaleLowerCase('fr') === this.activity().toLocaleLowerCase('fr') ? '' : title;
  });
  protected readonly isPast = computed(
    () => !!this.task().date && (this.task().date as string) < this.today,
  );
  protected readonly isRegistered = computed(() => {
    const uid = this.auth.uid();
    return uid !== null && uid in (this.task().participants ?? {});
  });
  protected readonly count = computed(() => headcount(this.task()));
  protected readonly needed = computed(() => this.task().needed ?? 0);
  protected readonly missing = computed(() => missingPeople(this.task()));
  protected readonly full = computed(() => isFull(this.task()));

  protected readonly stateClass = computed(() => {
    if (this.isPast()) return 'slot-past';
    if (this.full()) return 'slot-full';
    return this.needed() > 0 ? 'slot-open' : 'slot-neutral';
  });

  protected readonly names = computed(() => {
    const profiles = this.memberService.profiles();
    const names = Object.entries(this.task().participants ?? {})
      .map(([uid, storedName]) => profiles.get(uid)?.displayName ?? storedName)
      .sort((first, second) => first.localeCompare(second));
    const extra = this.task().extraPeople ?? 0;
    return [...names, ...(extra ? [`+ ${extra} hors application`] : [])].join(', ');
  });

  protected async toggleRegistration(): Promise<void> {
    const member = this.auth.member();
    if (!member) return;
    this.registrationToggled.emit();
    this.error.set(null);
    this.busy.set(true);
    try {
      await (this.isRegistered()
        ? this.taskService.unregister(this.task().id, member.uid)
        : this.taskService.register(this.task().id, member));
    } catch {
      this.error.set(
        "L'action n'a pas pu être enregistrée. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      this.busy.set(false);
    }
  }
}
