import { computed, inject, Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { compareByWhen, missingPeople } from '../models/task';
import { todayIso } from '../utils/calendar-math';
import { TaskService } from './task.service';

/** Les tâches à venir vues du membre connecté : partagées par l'accueil et le bandeau du haut. */
@Injectable({ providedIn: 'root' })
export class MyTasksService {
  private readonly auth = inject(AuthService);
  private readonly taskService = inject(TaskService);
  private readonly today = todayIso();

  readonly upcoming = computed(() =>
    this.taskService
      .tasks()
      .filter((task) => task.date && task.date >= this.today)
      .sort(compareByWhen),
  );

  readonly registered = computed(() => {
    const uid = this.auth.uid();
    return this.upcoming().filter((task) => uid !== null && uid in (task.participants ?? {}));
  });

  // Ce qui manque de monde et où je ne suis pas encore inscrit·e.
  readonly missing = computed(() => {
    const uid = this.auth.uid();
    return this.upcoming().filter(
      (task) => missingPeople(task) > 0 && !(uid !== null && uid in (task.participants ?? {})),
    );
  });
}
