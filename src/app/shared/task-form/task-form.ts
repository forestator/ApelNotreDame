import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { toneClass } from '../../core/models/tone';
import { AuthService } from '../../core/auth/auth.service';
import { TaskService } from '../../core/data/task.service';
import { frenchDateToIso, frenchDateValidator, isoToFrenchDate } from '../../core/utils/french-date';
import { DateField } from '../date-field/date-field';
import { uniqueId } from '../../core/utils/unique-id';
import { Task } from '../../core/models/task';
import { Commission } from '../../core/models/commission';
import { Project } from '../../core/models/project';

/** Formulaire d'ajout de tâche : la commission ou le projet sont imposés par la page, sinon on les choisit. */
@Component({
  selector: 'app-task-form',
  imports: [DateField, ReactiveFormsModule],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskForm implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly taskService = inject(TaskService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  // Renseigné = mode modification ; sinon création.
  readonly task = input<Task>();
  readonly done = output<void>();
  // Échéance préremplie (aaaa-mm-jj), p. ex. le jour cliqué dans le calendrier.
  readonly initialDueDate = input<string>();
  readonly fixedCommissionId = input<string>();
  readonly fixedProjectId = input<string>();
  readonly commissions = input<Commission[]>([]);
  readonly projects = input<Project[]>([]);

  protected readonly id = uniqueId('task-form');
  protected readonly error = signal<string | null>(null);
  // En modification on peut toujours déplacer la tâche vers une autre commission ou un autre projet.
  protected readonly showCommission = computed(() => !this.fixedCommissionId() || !!this.task());
  protected readonly showProject = computed(() => !this.fixedProjectId() || !!this.task());

  protected readonly form = this.formBuilder.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    dueDate: ['', frenchDateValidator],
    helpersNeeded: [0, [Validators.min(0), Validators.max(50)]],
    commissionId: [''],
    projectId: [''],
  });

  // Les listes déroulantes reprennent la couleur de la commission ou du projet choisi.
  private readonly commissionValue = toSignal(this.form.controls.commissionId.valueChanges, { initialValue: '' });
  private readonly projectValue = toSignal(this.form.controls.projectId.valueChanges, { initialValue: '' });

  protected readonly commissionOptions = computed(() =>
    this.commissions().map((commission) => ({ id: commission.id, name: commission.name, tone: toneClass(commission.color) })),
  );
  protected readonly projectOptions = computed(() =>
    this.projects().map((project) => ({ id: project.id, name: project.name, tone: toneClass(project.color) })),
  );
  protected readonly commissionTone = computed(
    () => this.commissionOptions().find((option) => option.id === this.commissionValue())?.tone ?? '',
  );
  protected readonly projectTone = computed(
    () => this.projectOptions().find((option) => option.id === this.projectValue())?.tone ?? '',
  );

  ngOnInit(): void {
    const task = this.task();
    if (!task) {
      this.form.controls.dueDate.setValue(isoToFrenchDate(this.initialDueDate() ?? null));
      return;
    }
    this.form.setValue({
      title: task.title,
      description: task.description,
      dueDate: isoToFrenchDate(task.dueDate),
      commissionId: task.commissionId,
      projectId: task.projectId ?? '',
      helpersNeeded: task.helpersNeeded ?? 0,
    });
  }

  protected async submit(): Promise<void> {
    const uid = this.auth.uid();
    if (this.form.invalid || !uid) return;
    const { title, description, dueDate, commissionId, projectId, helpersNeeded } = this.form.getRawValue();
    const editedTask = this.task();
    const commission = editedTask ? commissionId : (this.fixedCommissionId() ?? commissionId);
    if (!commission) {
      this.error.set('Choisissez la commission responsable de cette tâche.');
      return;
    }
    this.error.set(null);
    try {
      if (editedTask) {
        await this.taskService.update(editedTask.id, {
          title,
          description,
          dueDate: frenchDateToIso(dueDate),
          commissionId: commission,
          projectId: projectId || null,
          helpersNeeded: helpersNeeded || 0,
        });
        this.done.emit();
        return;
      }
      await this.taskService.add({
        commissionId: commission,
        projectId: (this.fixedProjectId() ?? projectId) || null,
        title,
        description,
        dueDate: frenchDateToIso(dueDate),
        status: 'todo',
        assigneeUid: null,
        assigneeName: null,
        helpers: {},
        helpersNeeded: helpersNeeded || 0,
        createdBy: uid,
      });
      this.form.reset();
      this.done.emit();
    } catch {
      this.error.set(editedTask ? "La tâche n'a pas pu être modifiée." : "La tâche n'a pas pu être ajoutée.");
    }
  }
}
