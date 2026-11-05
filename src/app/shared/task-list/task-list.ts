import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../core/data/project.service';
import { ViewModeService } from '../../core/data/view-mode.service';
import { groupByActivity, Task } from '../../core/models/task';
import { toneClass } from '../../core/models/tone';
import { TaskItem } from '../task-item/task-item';
import { TaskSlot } from '../task-slot/task-slot';

/** Liste de tâches, en cartes détaillées ou regroupées par activité selon le choix de l'utilisateur. */
@Component({
  selector: 'app-task-list',
  imports: [RouterLink, TaskItem, TaskSlot],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskList {
  private readonly projectService = inject(ProjectService);

  readonly tasks = input.required<Task[]>();
  readonly showProject = input(true);
  // Le résumé « X/Y créneaux complets » n'a de sens que si la liste contient tous les créneaux de l'activité.
  readonly showSummary = input(true);
  readonly canAddSlot = input(false);
  readonly registrationToggled = output<Task>();
  readonly slotRequested = output<string>();

  protected readonly condensed = inject(ViewModeService).condensed;

  protected readonly groups = computed(() =>
    groupByActivity(this.tasks()).map((group) => {
      const project = this.projectService
        .projects()
        .find((candidate) => candidate.id === group.projectId);
      return { ...group, projectName: project?.name, projectTone: toneClass(project?.color) };
    }),
  );
}
