import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { headcount, isFull, Task } from '../../core/models/task';
import { toneClass } from '../../core/models/tone';
import {
  dayLabel,
  daysInMonth,
  leadingBlanks,
  monthLabel,
  toIso,
  WEEKDAYS,
} from '../../core/utils/calendar-math';
import { formatTime } from '../../core/utils/french-time';
import { Loader } from '../../shared/loader/loader';
import { Modal } from '../../shared/modal/modal';
import { TaskForm } from '../../shared/task-form/task-form';

interface CalendarEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  subtitle: string;
  kind: 'task' | 'project';
  link: string[];
  tone: string;
  full: boolean;
}

@Component({
  selector: 'app-calendar',
  imports: [Loader, Modal, RouterLink, TaskForm],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calendar {
  private readonly taskService = inject(TaskService);
  private readonly projectService = inject(ProjectService);

  private readonly now = new Date();
  protected readonly todayIso = toIso(this.now.getFullYear(), this.now.getMonth(), this.now.getDate());
  protected readonly weekdays = WEEKDAYS;
  protected readonly projects = this.projectService.projects;
  protected readonly loading = computed(() => !this.taskService.loaded() || !this.projectService.loaded());

  protected readonly adding = signal(false);
  // Jour cliqué (aaaa-mm-jj) : devient la date préremplie de la nouvelle tâche.
  protected readonly addDate = signal<string | undefined>(undefined);

  // Mois affiché (0 = janvier).
  private readonly visible = signal({ year: this.now.getFullYear(), month: this.now.getMonth() });

  protected readonly monthLabel = computed(() => monthLabel(this.visible().year, this.visible().month));

  private readonly events = computed<CalendarEvent[]>(() => {
    const projects = new Map(this.projectService.projects().map((project) => [project.id, project]));

    const taskEvents = this.taskService
      .tasks()
      .filter((task): task is Task & { date: string } => !!task.date)
      .map<CalendarEvent>((task) => {
        const project = projects.get(task.projectId);
        const people = task.needed > 0 ? `${headcount(task)}/${task.needed} pers.` : `${headcount(task)} inscrit(s)`;
        return {
          id: `task-${task.id}`,
          date: task.date,
          time: task.time ?? '',
          title: task.title,
          subtitle: [formatTime(task.time), people].filter(Boolean).join(' · '),
          kind: 'task',
          link: ['/projets', task.projectId],
          tone: toneClass(project?.color),
          full: isFull(task),
        };
      });

    const projectEvents = this.projectService
      .projects()
      .filter((project) => project.dueDate)
      .map<CalendarEvent>((project) => ({
        id: `project-${project.id}`,
        date: project.dueDate as string,
        time: '',
        title: project.name,
        subtitle: 'Date du projet',
        kind: 'project',
        link: ['/projets', project.id],
        tone: toneClass(project.color),
        full: false,
      }));

    // Dans une même journée : l'événement du projet d'abord, puis les tâches par heure.
    return [...projectEvents, ...taskEvents].sort(
      (first, second) => first.date.localeCompare(second.date) || first.time.localeCompare(second.time),
    );
  });

  // Une case par jour du mois, précédée de cases vides pour aligner sur le lundi.
  protected readonly cells = computed(() => {
    const { year, month } = this.visible();
    const byDate = new Map<string, CalendarEvent[]>();
    for (const event of this.events()) byDate.set(event.date, [...(byDate.get(event.date) ?? []), event]);

    const blanks = Array.from({ length: leadingBlanks(year, month) }, (_, index) => ({
      key: `blank-${index}`,
      day: 0,
      label: '',
      isToday: false,
      events: [] as CalendarEvent[],
    }));
    const days = Array.from({ length: daysInMonth(year, month) }, (_, index) => {
      const day = index + 1;
      const iso = toIso(year, month, day);
      return {
        key: iso,
        day,
        label: dayLabel(year, month, day),
        isToday: iso === this.todayIso,
        events: byDate.get(iso) ?? [],
      };
    });
    return [...blanks, ...days];
  });

  protected readonly monthEventCount = computed(() => this.cells().reduce((total, cell) => total + cell.events.length, 0));

  protected startAdding(isoDate?: string): void {
    this.addDate.set(isoDate);
    this.adding.set(true);
  }

  protected stopAdding(): void {
    this.adding.set(false);
  }

  protected previousMonth(): void {
    this.visible.update(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  }

  protected nextMonth(): void {
    this.visible.update(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));
  }

  protected goToToday(): void {
    this.visible.set({ year: this.now.getFullYear(), month: this.now.getMonth() });
  }
}
