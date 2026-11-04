import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { compareByWhen, missingPeople, Task } from '../../core/models/task';
import { todayIso } from '../../core/utils/calendar-math';
import { Loader } from '../../shared/loader/loader';
import { TaskItem } from '../../shared/task-item/task-item';

@Component({
  selector: 'app-dashboard',
  imports: [Loader, TaskItem],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly auth = inject(AuthService);
  private readonly taskService = inject(TaskService);
  private readonly today = todayIso();

  protected readonly member = this.auth.member;
  private readonly projectService = inject(ProjectService);
  protected readonly loading = computed(() => !this.taskService.loaded() || !this.projectService.loaded());
  protected readonly projectCount = computed(() => this.projectService.projects().length);

  private readonly upcoming = computed(() =>
    this.taskService
      .tasks()
      .filter((task) => task.date && task.date >= this.today)
      .sort(compareByWhen),
  );

  private readonly isRegistered = (participants: Record<string, string> | undefined) => {
    const uid = this.auth.uid();
    return uid !== null && uid in (participants ?? {});
  };

  private readonly registeredNow = computed(() => this.upcoming().filter((task) => this.isRegistered(task.participants)));

  // Ce qui manque de monde et où je ne suis pas encore inscrit·e.
  private readonly missingNow = computed(() =>
    this.upcoming().filter((task) => missingPeople(task) > 0 && !this.isRegistered(task.participants)),
  );

  protected readonly mineCount = computed(() => this.registeredNow().length);
  protected readonly needsCount = computed(() => this.missingNow().length);

  // Une tâche sur laquelle on vient de cliquer reste dans sa section jusqu'au prochain chargement :
  // la voir sauter dans une autre liste désoriente.
  private readonly pinned = signal<Record<string, 'mine' | 'needs'>>({});

  protected readonly mine = computed(() => this.inSection('mine', this.registeredNow()));
  protected readonly needsPeople = computed(() => this.inSection('needs', this.missingNow()));

  protected pin(task: Task, section: 'mine' | 'needs'): void {
    this.pinned.update((current) => (task.id in current ? current : { ...current, [task.id]: section }));
  }

  private inSection(section: 'mine' | 'needs', natural: Task[]): Task[] {
    const pinned = this.pinned();
    const naturalIds = new Set(natural.map((task) => task.id));
    return this.upcoming().filter((task) =>
      task.id in pinned ? pinned[task.id] === section : naturalIds.has(task.id),
    );
  }

  protected readonly toSchedule = computed(() =>
    this.taskService
      .tasks()
      .filter((task) => !task.date)
      .sort(compareByWhen),
  );
}
