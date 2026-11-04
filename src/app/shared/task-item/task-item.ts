import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MemberService } from '../../core/data/member.service';
import { NotificationService } from '../../core/data/notification.service';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { headcount, isFull, missingPeople, Task } from '../../core/models/task';
import { toneClass } from '../../core/models/tone';
import { longDayLabel, todayIso } from '../../core/utils/calendar-math';
import { formatTime } from '../../core/utils/french-time';
import { uniqueId } from '../../core/utils/unique-id';
import { Avatar } from '../avatar/avatar';
import { TaskComments } from '../task-comments/task-comments';
import { TaskForm } from '../task-form/task-form';

@Component({
  selector: 'app-task-item',
  imports: [Avatar, RouterLink, TaskComments, TaskForm],
  templateUrl: './task-item.html',
  styleUrl: './task-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskItem {
  private readonly auth = inject(AuthService);
  private readonly taskService = inject(TaskService);
  private readonly memberService = inject(MemberService);
  private readonly notifications = inject(NotificationService);
  private readonly today = todayIso();

  readonly task = input.required<Task>();
  // Masqué sur la page du projet lui-même, où il serait redondant.
  readonly showProject = input(true);

  protected readonly menuId = uniqueId('task-menu');
  protected readonly commentsId = uniqueId('task-comments');
  protected readonly projects = inject(ProjectService).projects;
  protected readonly editing = signal(false);
  protected readonly manageOpen = signal(false);
  protected readonly commentsOpen = signal(false);
  protected readonly confirmingRemoval = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly project = computed(() => this.projects().find((project) => project.id === this.task().projectId));
  protected readonly projectName = computed(() => this.project()?.name);
  protected readonly projectTone = computed(() => toneClass(this.project()?.color));

  // Mêmes périmètres que les règles Firestore : un admin ou le créateur gère la tâche.
  protected readonly canManage = computed(() => this.auth.isAdmin() || this.task().createdBy === this.auth.uid());
  protected readonly isPast = computed(() => !!this.task().date && (this.task().date as string) < this.today);
  protected readonly isRegistered = computed(() => {
    const uid = this.auth.uid();
    return uid !== null && uid in (this.task().participants ?? {});
  });

  protected readonly count = computed(() => headcount(this.task()));
  protected readonly needed = computed(() => this.task().needed ?? 0);
  protected readonly missing = computed(() => missingPeople(this.task()));
  protected readonly full = computed(() => isFull(this.task()));
  protected readonly percent = computed(() =>
    this.needed() ? Math.min(100, Math.round((this.count() / this.needed()) * 100)) : 0,
  );
  protected readonly extraPeople = computed(() => this.task().extraPeople ?? 0);

  protected readonly when = computed(() =>
    [this.task().date ? longDayLabel(this.task().date as string) : 'Date à confirmer', formatTime(this.task().time)]
      .filter(Boolean)
      .join(' · '),
  );

  protected readonly stateClass = computed(() => {
    if (this.isPast()) return 'task-past';
    if (this.full()) return 'task-full';
    return this.needed() > 0 ? 'task-open' : 'task-neutral';
  });

  protected readonly people = computed(() =>
    Object.entries(this.task().participants ?? {})
      .map(([uid, storedName]) => {
        const profile = this.memberService.profiles().get(uid);
        return {
          uid,
          name: profile?.displayName ?? storedName,
          photo: profile?.photoURL ?? null,
          removable: this.canManage(),
        };
      })
      .sort((first, second) => first.name.localeCompare(second.name)),
  );

  protected readonly addable = computed(() =>
    this.memberService.approved().filter((member) => !(member.uid in (this.task().participants ?? {}))),
  );

  protected async toggleRegistration(): Promise<void> {
    const member = this.auth.member();
    if (!member) return;
    await this.attempt(() =>
      this.isRegistered()
        ? this.taskService.unregister(this.task().id, member.uid)
        : this.taskService.register(this.task().id, member),
    );
  }

  protected async addPerson(uid: string): Promise<void> {
    const member = this.addable().find((candidate) => candidate.uid === uid);
    if (!member) return;
    await this.attempt(() => this.taskService.register(this.task().id, member));
    await this.notifications.notifyRegistered(member, this.task(), this.projectName());
  }

  protected removePerson(uid: string): Promise<void> {
    return this.attempt(() => this.taskService.unregister(this.task().id, uid));
  }

  protected remove(): Promise<void> {
    return this.attempt(() => this.taskService.remove(this.task().id));
  }

  protected toggleManage(): void {
    this.manageOpen.update((open) => !open);
    this.confirmingRemoval.set(false);
  }

  protected toggleComments(): void {
    this.commentsOpen.update((open) => !open);
  }

  protected startEditing(): void {
    this.manageOpen.set(false);
    this.editing.set(true);
  }

  protected stopEditing(): void {
    this.editing.set(false);
  }

  protected askRemoval(): void {
    this.confirmingRemoval.set(true);
  }

  protected cancelRemoval(): void {
    this.confirmingRemoval.set(false);
  }

  // Une écriture refusée ne doit jamais passer inaperçue : on affiche l'erreur sur la carte.
  private async attempt(action: () => Promise<void>): Promise<void> {
    this.error.set(null);
    this.busy.set(true);
    try {
      await action();
    } catch {
      this.error.set("L'action n'a pas pu être enregistrée. Vérifiez votre connexion et réessayez.");
    } finally {
      this.busy.set(false);
    }
  }
}
