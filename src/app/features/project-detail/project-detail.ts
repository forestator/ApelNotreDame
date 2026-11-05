import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { compareByWhen, isFull } from '../../core/models/task';
import { toneClass } from '../../core/models/tone';
import { Loader } from '../../shared/loader/loader';
import { Modal } from '../../shared/modal/modal';
import { Progress } from '../../shared/progress/progress';
import { ProjectForm } from '../../shared/project-form/project-form';
import { TaskForm } from '../../shared/task-form/task-form';
import { TaskList } from '../../shared/task-list/task-list';

@Component({
  selector: 'app-project-detail',
  imports: [
    DatePipe,
    Loader,
    Modal,
    Progress,
    ProjectForm,
    RouterLink,
    TaskForm,
    TaskList,
  ],
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
  protected readonly error = signal<string | null>(null);
  protected readonly confirmingRemoval = signal(false);
  protected readonly editing = signal(false);
  protected readonly adding = signal(false);
  protected readonly addingToActivity = signal<string | undefined>(undefined);

  protected readonly project = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) => this.projectService.project$(id)),
      // undefined = en chargement, null = introuvable
      map((project) => project ?? null),
    ),
  );
  // undefined tant que la première réponse n'est pas arrivée (on affiche alors un loader).
  private readonly projectTasks = toSignal(
    toObservable(this.id).pipe(switchMap((id) => this.taskService.forProject$(id))),
  );
  protected readonly tasksLoaded = computed(() => this.projectTasks() !== undefined);

  protected readonly tone = computed(() => toneClass(this.project()?.color));
  protected readonly tasks = computed(() => [...(this.projectTasks() ?? [])].sort(compareByWhen));

  private readonly withTarget = computed(() =>
    (this.projectTasks() ?? []).filter((task) => (task.needed ?? 0) > 0),
  );
  protected readonly doneCount = computed(() => this.withTarget().filter(isFull).length);
  protected readonly totalCount = computed(() => this.withTarget().length);

  protected startAdding(activity?: string): void {
    this.addingToActivity.set(activity);
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
