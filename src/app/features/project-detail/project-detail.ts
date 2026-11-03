import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { toneClass } from '../../core/models/tone';
import { CommissionService } from '../../core/data/commission.service';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { Progress } from '../../shared/progress/progress';
import { Modal } from '../../shared/modal/modal';
import { ProjectForm } from '../../shared/project-form/project-form';
import { TaskForm } from '../../shared/task-form/task-form';
import { TaskItem } from '../../shared/task-item/task-item';

@Component({
  selector: 'app-project-detail',
  imports: [DatePipe, Modal, ProjectForm, Progress, RouterLink, TaskForm, TaskItem],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetail {
  private readonly auth = inject(AuthService);
  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);
  private readonly router = inject(Router);

  // Alimenté par le paramètre de route :id (withComponentInputBinding).
  readonly id = input.required<string>();

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly commissions = inject(CommissionService).commissions;
  protected readonly error = signal<string | null>(null);
  protected readonly confirmingRemoval = signal(false);
  protected readonly editing = signal(false);
  protected readonly adding = signal(false);

  protected readonly project = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) => this.projectService.project$(id)),
      // undefined = en chargement, null = introuvable
      map((project) => project ?? null),
    ),
  );
  private readonly projectTasks = toSignal(
    toObservable(this.id).pipe(switchMap((id) => this.taskService.forProject$(id))),
    { initialValue: [] },
  );

  protected readonly tone = computed(() => toneClass(this.project()?.color));
  protected readonly doneCount = computed(() => this.projectTasks().filter((task) => task.status === 'done').length);
  protected readonly totalCount = computed(() => this.projectTasks().length);

  // Une section par commission impliquée ; le responsable de la commission peut gérer ses tâches.
  protected readonly groups = computed(() => {
    const uid = this.auth.uid();
    return this.commissions()
      .map((commission) => ({
        commission,
        tone: toneClass(commission.color),
        canManage: this.isAdmin() || commission.leadUid === uid,
        tasks: this.projectTasks()
          .filter((task) => task.commissionId === commission.id)
          .sort((first, second) => Number(first.status === 'done') - Number(second.status === 'done')),
      }))
      .filter((group) => group.tasks.length > 0);
  });

  protected startAdding(): void {
    this.adding.set(true);
  }

  protected stopAdding(): void {
    this.adding.set(false);
  }

  protected startEditing(): void {
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

  protected async removeProject(): Promise<void> {
    try {
      await this.projectService.remove(this.id());
    } catch {
      this.error.set("Le projet n'a pas pu être supprimé.");
      this.confirmingRemoval.set(false);
      return;
    }
    await this.router.navigateByUrl('/projets');
  }
}
