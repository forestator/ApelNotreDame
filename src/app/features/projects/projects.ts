import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { isFull } from '../../core/models/task';
import { toneClass } from '../../core/models/tone';
import { Loader } from '../../shared/loader/loader';
import { Modal } from '../../shared/modal/modal';
import { ProjectForm } from '../../shared/project-form/project-form';
import { Progress } from '../../shared/progress/progress';

@Component({
  selector: 'app-projects',
  imports: [DatePipe, Loader, Modal, Progress, ProjectForm, RouterLink],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Projects {
  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);

  protected readonly isAdmin = inject(AuthService).isAdmin;
  protected readonly adding = signal(false);
  protected readonly loading = computed(() => !this.projectService.loaded() || !this.taskService.loaded());

  protected readonly cards = computed(() => {
    const tasks = this.taskService.tasks();
    return this.projectService.projects().map((project) => {
      const own = tasks.filter((task) => task.projectId === project.id);
      // L'avancement ne compte que les tâches qui ont un effectif à atteindre.
      const withTarget = own.filter((task) => (task.needed ?? 0) > 0);
      return {
        project,
        count: own.length,
        done: withTarget.filter(isFull).length,
        total: withTarget.length,
        tone: toneClass(project.color),
      };
    });
  });

  protected startAdding(): void {
    this.adding.set(true);
  }

  protected stopAdding(): void {
    this.adding.set(false);
  }
}
