import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CommissionService } from '../../core/data/commission.service';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { Task } from '../../core/models/task';
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
  private readonly commissionService = inject(CommissionService);
  private readonly projectService = inject(ProjectService);

  protected readonly member = this.auth.member;
  protected readonly isAdmin = this.auth.isAdmin;

  protected readonly commissionNames = computed(
    () => new Map(this.commissionService.commissions().map((commission) => [commission.id, commission.name])),
  );

  private readonly projectNames = computed(
    () => new Map(this.projectService.projects().map((project) => [project.id, project.name])),
  );

  private readonly openTasks = computed(() => this.taskService.tasks().filter((task) => task.status !== 'done'));

  // Le nom de commission est résolu ici pour ne pas appeler de fonction dans le template.
  private readonly withCommissionName = (tasks: Task[]) =>
    tasks.map((task) => ({
      task,
      commissionName: this.commissionNames().get(task.commissionId),
      projectName: task.projectId ? this.projectNames().get(task.projectId) : undefined,
    }));

  // Je suis concerné si je suis responsable ou aidant de la tâche.
  private readonly isInvolved = (task: Task) => {
    const uid = this.auth.uid();
    return uid !== null && (task.assigneeUid === uid || uid in (task.helpers ?? {}));
  };

  protected readonly myTasks = computed(() => this.withCommissionName(this.openTasks().filter(this.isInvolved)));

  // Tâches à plusieurs qui n'ont pas encore assez d'aidants (hors celles où je suis déjà impliqué).
  protected readonly helpTasks = computed(() =>
    this.withCommissionName(
      this.openTasks().filter(
        (task) =>
          (task.helpersNeeded ?? 0) - Object.keys(task.helpers ?? {}).length > 0 && !this.isInvolved(task),
      ),
    ),
  );

  protected readonly projectCount = computed(() => this.projectService.projects().length);
  protected readonly commissionCount = computed(() => this.commissionService.commissions().length);

  protected readonly freeTasks = computed(() =>
    this.withCommissionName(this.openTasks().filter((task) => task.assigneeUid === null)),
  );
}
