import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { compareByWhen, missingPeople } from '../../core/models/task';
import { todayIso } from '../../core/utils/calendar-math';
import { TaskItem } from '../../shared/task-item/task-item';

@Component({
  selector: 'app-dashboard',
  imports: [TaskItem],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly auth = inject(AuthService);
  private readonly taskService = inject(TaskService);
  private readonly today = todayIso();

  protected readonly member = this.auth.member;
  protected readonly projectCount = computed(() => inject(ProjectService).projects().length);

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

  protected readonly mine = computed(() =>
    this.upcoming().filter((task) => this.isRegistered(task.participants)),
  );

  // Ce qui manque de monde et où je ne suis pas encore inscrit·e.
  protected readonly needsPeople = computed(() =>
    this.upcoming().filter((task) => missingPeople(task) > 0 && !this.isRegistered(task.participants)),
  );

  protected readonly toSchedule = computed(() =>
    this.taskService
      .tasks()
      .filter((task) => !task.date)
      .sort(compareByWhen),
  );
}
