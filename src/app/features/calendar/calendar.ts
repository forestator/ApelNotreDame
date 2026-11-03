import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommissionService } from '../../core/data/commission.service';
import { ProjectService } from '../../core/data/project.service';
import { TaskService } from '../../core/data/task.service';
import { toneClass } from '../../core/models/tone';
import { dayLabel, daysInMonth, leadingBlanks, monthLabel, toIso, WEEKDAYS } from '../../core/utils/calendar-math';
import { Modal } from '../../shared/modal/modal';
import { TaskForm } from '../../shared/task-form/task-form';

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  kind: 'task' | 'project';
  link: string[];
  tone: string;
  done: boolean;
}

@Component({
  selector: 'app-calendar',
  imports: [Modal, RouterLink, TaskForm],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calendar {
  private readonly taskService = inject(TaskService);
  private readonly projectService = inject(ProjectService);
  private readonly commissionService = inject(CommissionService);

  private readonly now = new Date();
  protected readonly todayIso = toIso(this.now.getFullYear(), this.now.getMonth(), this.now.getDate());
  protected readonly weekdays = WEEKDAYS;
  protected readonly commissions = this.commissionService.commissions;
  protected readonly projects = this.projectService.projects;

  protected readonly adding = signal(false);
  // Jour cliqué (aaaa-mm-jj) : devient l'échéance préremplie de la nouvelle tâche.
  protected readonly addDate = signal<string | undefined>(undefined);

  // Mois affiché (0 = janvier).
  private readonly visible = signal({ year: this.now.getFullYear(), month: this.now.getMonth() });

  protected readonly monthLabel = computed(() => monthLabel(this.visible().year, this.visible().month));

  private readonly events = computed<CalendarEvent[]>(() => {
    const commissions = new Map(this.commissionService.commissions().map((commission) => [commission.id, commission]));
    const projects = new Map(this.projectService.projects().map((project) => [project.id, project]));

    const taskEvents = this.taskService
      .tasks()
      .filter((task) => task.dueDate)
      .map<CalendarEvent>((task) => {
        const commission = commissions.get(task.commissionId);
        const project = task.projectId ? projects.get(task.projectId) : undefined;
        return {
          id: `task-${task.id}`,
          date: task.dueDate as string,
          title: task.title,
          subtitle: [project?.name, commission?.name].filter(Boolean).join(' · '),
          kind: 'task',
          link: ['/commissions', task.commissionId],
          // La couleur du projet prime : c'est lui qui regroupe les échéances.
          tone: toneClass((project ?? commission)?.color),
          done: task.status === 'done',
        };
      });

    const projectEvents = this.projectService
      .projects()
      .filter((project) => project.dueDate)
      .map<CalendarEvent>((project) => ({
        id: `project-${project.id}`,
        date: project.dueDate as string,
        title: project.name,
        subtitle: 'Date du projet',
        kind: 'project',
        link: ['/projets', project.id],
        tone: toneClass(project.color),
        done: false,
      }));

    return [...projectEvents, ...taskEvents];
  });

  // Une case par jour du mois, précédée de cases vides pour aligner sur le lundi.
  protected readonly cells = computed(() => {
    const { year, month } = this.visible();
    const leading = leadingBlanks(year, month);
    const byDate = new Map<string, CalendarEvent[]>();
    for (const event of this.events()) byDate.set(event.date, [...(byDate.get(event.date) ?? []), event]);

    const blanks = Array.from({ length: leading }, (_, index) => ({ key: `blank-${index}`, day: 0 }));
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
    return [...blanks.map((blank) => ({ ...blank, label: '', isToday: false, events: [] as CalendarEvent[] })), ...days];
  });

  protected readonly monthEventCount = computed(() => this.cells().reduce((total, cell) => total + cell.events.length, 0));

  protected readonly overdue = computed(() =>
    this.events()
      .filter((event) => event.kind === 'task' && !event.done && event.date < this.todayIso)
      .sort((first, second) => first.date.localeCompare(second.date))
      .map((event) => ({ ...event, dateLabel: event.date.split('-').reverse().join('/') })),
  );

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
