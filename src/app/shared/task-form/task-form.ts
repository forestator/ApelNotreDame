import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { TaskService } from '../../core/data/task.service';
import { Project } from '../../core/models/project';
import { Task } from '../../core/models/task';
import { toneClass } from '../../core/models/tone';
import { frenchDateToIso, frenchDateValidator, isoToFrenchDate } from '../../core/utils/french-date';
import { normalizeTime, timeValidator } from '../../core/utils/french-time';
import { uniqueId } from '../../core/utils/unique-id';
import { DateField } from '../date-field/date-field';

/** Création d'une tâche, ou modification si `task` est renseignée. */
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

  readonly task = input<Task>();
  readonly done = output<void>();
  readonly projects = input<Project[]>([]);
  // Projet imposé par la page (page du projet) ; en modification on peut toujours changer de projet.
  readonly fixedProjectId = input<string>();
  // Date préremplie (aaaa-mm-jj), p. ex. le jour cliqué dans le calendrier.
  readonly initialDate = input<string>();

  protected readonly id = uniqueId('task-form');
  protected readonly error = signal<string | null>(null);
  protected readonly showProject = computed(() => !this.fixedProjectId() || !!this.task());

  protected readonly form = this.formBuilder.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    projectId: [''],
    date: ['', frenchDateValidator],
    time: ['', timeValidator],
    needed: [0, [Validators.min(0), Validators.max(200)]],
    extraPeople: [0, [Validators.min(0), Validators.max(200)]],
  });

  // Le menu des projets reprend la couleur du projet choisi.
  private readonly projectValue = toSignal(this.form.controls.projectId.valueChanges, { initialValue: '' });
  private readonly timeStatus = toSignal(this.form.controls.time.statusChanges, {
    initialValue: this.form.controls.time.status,
  });
  protected readonly timeInvalid = computed(() => this.timeStatus() === 'INVALID');

  protected readonly projectOptions = computed(() =>
    this.projects().map((project) => ({ id: project.id, name: project.name, tone: toneClass(project.color) })),
  );
  protected readonly projectTone = computed(
    () => this.projectOptions().find((option) => option.id === this.projectValue())?.tone ?? '',
  );

  ngOnInit(): void {
    const task = this.task();
    if (!task) {
      this.form.controls.date.setValue(isoToFrenchDate(this.initialDate() ?? null));
      return;
    }
    this.form.setValue({
      title: task.title,
      description: task.description,
      projectId: task.projectId,
      date: isoToFrenchDate(task.date),
      time: task.time ?? '',
      needed: task.needed ?? 0,
      extraPeople: task.extraPeople ?? 0,
    });
  }

  protected async submit(): Promise<void> {
    const uid = this.auth.uid();
    if (this.form.invalid || !uid) return;
    const raw = this.form.getRawValue();
    const editedTask = this.task();
    const projectId = editedTask ? raw.projectId : (this.fixedProjectId() ?? raw.projectId);
    if (!projectId) {
      this.error.set('Choisissez le projet de cette tâche.');
      return;
    }
    this.error.set(null);

    const values = {
      title: raw.title.trim(),
      description: raw.description,
      projectId,
      date: frenchDateToIso(raw.date),
      time: normalizeTime(raw.time),
      needed: raw.needed || 0,
      extraPeople: raw.extraPeople || 0,
    };

    try {
      if (editedTask) {
        await this.taskService.update(editedTask.id, values);
      } else {
        await this.taskService.add({ ...values, participants: {}, createdBy: uid });
        this.form.reset();
      }
      this.done.emit();
    } catch {
      this.error.set(editedTask ? "La tâche n'a pas pu être modifiée." : "La tâche n'a pas pu être ajoutée.");
    }
  }
}
