import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toneClass } from '../../core/models/tone';
import { AuthService } from '../../core/auth/auth.service';
import { CommissionService } from '../../core/data/commission.service';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { Progress } from '../../shared/progress/progress';
import { Modal } from '../../shared/modal/modal';
import { ProjectForm } from '../../shared/project-form/project-form';

@Component({
  selector: 'app-projects',
  imports: [DatePipe, Modal, ProjectForm, Progress, RouterLink],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Projects {
  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);
  private readonly commissionService = inject(CommissionService);

  protected readonly isAdmin = inject(AuthService).isAdmin;
  protected readonly adding = signal(false);

  protected readonly cards = computed(() => {
    const tasks = this.taskService.tasks();
    const commissionNames = new Map(
      this.commissionService.commissions().map((commission) => [commission.id, commission.name]),
    );
    return this.projectService.projects().map((project) => {
      const own = tasks.filter((task) => task.projectId === project.id);
      const open = own.filter((task) => task.status !== 'done').length;
      const free = own.filter((task) => task.status !== 'done' && task.assigneeUid === null).length;
      const involved = [...new Set(own.map((task) => commissionNames.get(task.commissionId)).filter(Boolean))].join(', ');
      const done = own.length - open;
      return { project, open, free, involved, done, total: own.length, tone: toneClass(project.color) };
    });
  });

  protected startAdding(): void {
    this.adding.set(true);
  }

  protected stopAdding(): void {
    this.adding.set(false);
  }
}
