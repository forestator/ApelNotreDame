import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MyTasksService } from '../../core/data/my-tasks.service';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { compareByWhen, Task } from '../../core/models/task';
import { Loader } from '../../shared/loader/loader';
import { TaskList } from '../../shared/task-list/task-list';

@Component({
  selector: 'app-dashboard',
  imports: [Loader, TaskList],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly taskService = inject(TaskService);

  private readonly projectService = inject(ProjectService);
  protected readonly loading = computed(
    () => !this.taskService.loaded() || !this.projectService.loaded(),
  );

  private readonly myTasks = inject(MyTasksService);
  private readonly upcoming = this.myTasks.upcoming;
  private readonly registeredNow = this.myTasks.registered;
  private readonly missingNow = this.myTasks.missing;

  // Une tâche sur laquelle on vient de cliquer reste dans sa section jusqu'au prochain chargement :
  // la voir sauter dans une autre liste désoriente.
  private readonly pinned = signal<Record<string, 'mine' | 'needs'>>({});

  protected readonly mine = computed(() => this.inSection('mine', this.registeredNow()));
  protected readonly needsPeople = computed(() => this.inSection('needs', this.missingNow()));

  protected pin(task: Task, section: 'mine' | 'needs'): void {
    this.pinned.update((current) =>
      task.id in current ? current : { ...current, [task.id]: section },
    );
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
