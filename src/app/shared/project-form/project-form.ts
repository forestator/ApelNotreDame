import { ChangeDetectionStrategy, Component, inject, input, OnInit, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectService } from '../../core/data/project.service';
import { Project } from '../../core/models/project';
import { Tone } from '../../core/models/tone';
import { TonePicker } from '../tone-picker/tone-picker';
import { frenchDateToIso, frenchDateValidator, isoToFrenchDate } from '../../core/utils/french-date';
import { DateField } from '../date-field/date-field';
import { uniqueId } from '../../core/utils/unique-id';

/** Création d'un projet, ou modification si `project` est renseigné. */
@Component({
  selector: 'app-project-form',
  imports: [DateField, ReactiveFormsModule, TonePicker],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectForm implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly project = input<Project>();
  readonly done = output<void>();

  protected readonly id = uniqueId('project-form');
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: [''],
    dueDate: ['', frenchDateValidator],
    color: ['teal' as Tone],
  });

  ngOnInit(): void {
    const project = this.project();
    if (!project) return;
    this.form.setValue({
      name: project.name,
      description: project.description,
      dueDate: isoToFrenchDate(project.dueDate),
      color: project.color ?? 'teal',
    });
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.error.set(null);
    const { name, description, dueDate, color } = this.form.getRawValue();
    const values = { name, description, color, dueDate: frenchDateToIso(dueDate) };
    const project = this.project();
    try {
      if (project) {
        await this.projectService.update(project.id, values);
        this.done.emit();
      } else {
        await this.projectService.add(values);
        this.form.reset();
        this.done.emit();
      }
    } catch {
      this.error.set(project ? "Le projet n'a pas pu être modifié." : "Le projet n'a pas pu être créé.");
    }
  }
}
