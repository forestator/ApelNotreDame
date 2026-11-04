/**
 * Une tâche = un rendez-vous qui demande plusieurs personnes (montage du chapiteau, stands…).
 * Pas de statut à gérer : « complet » et « passé » se déduisent des inscrits et de la date.
 */
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  // aaaa-mm-jj, ou null si le jour n'est pas encore fixé.
  date: string | null;
  // hh:mm, ou null.
  time: string | null;
  // Nombre de personnes recherchées (0 = pas de nombre précis).
  needed: number;
  // Personnes prévues mais sans compte dans l'application (ex. des parents prévenus de vive voix).
  extraPeople: number;
  // Inscrits : uid → nom.
  participants: Record<string, string>;
  createdBy: string;
  // Nombre de commentaires, tenu à jour à chaque ajout ou suppression.
  commentCount?: number;
}

export type NewTask = Omit<Task, 'id' | 'commentCount'>;

export function headcount(task: Task): number {
  return Object.keys(task.participants ?? {}).length + (task.extraPeople ?? 0);
}

export function missingPeople(task: Task): number {
  return Math.max((task.needed ?? 0) - headcount(task), 0);
}

export function isFull(task: Task): boolean {
  return (task.needed ?? 0) > 0 && headcount(task) >= task.needed;
}

/** Tri chronologique : les tâches sans date ou sans heure passent après. */
export function compareByWhen(first: Task, second: Task): number {
  const byDate = (first.date ?? '9999').localeCompare(second.date ?? '9999');
  if (byDate) return byDate;
  const byTime = (first.time ?? '99:99').localeCompare(second.time ?? '99:99');
  return byTime || first.title.localeCompare(second.title);
}
