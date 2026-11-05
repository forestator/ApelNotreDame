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
  // Nom de l'ensemble de créneaux auquel appartient la tâche (ex. « Père Noël et mascottes »).
  // Absent sur les anciennes tâches : elles restent affichées seules, rien n'est à migrer.
  activity?: string;
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

/** Nom de l'ensemble : l'activité si elle est renseignée, sinon le titre (comportement des tâches existantes). */
export function activityName(task: Task): string {
  return task.activity?.trim() || task.title.trim();
}

/** Les créneaux d'une même activité (même titre) : « Stand crêpes » à 10h, 12h, 14h… */
export interface ActivityGroup {
  title: string;
  projectId: string;
  tasks: Task[];
  // Créneaux qui demandent un nombre précis de personnes, et parmi eux ceux qui sont complets.
  targetSlots: number;
  fullSlots: number;
}

export function groupByActivity(tasks: Task[]): ActivityGroup[] {
  const groups = new Map<string, Task[]>();
  for (const task of [...tasks].sort(compareByWhen)) {
    // Deux projets peuvent avoir une activité du même nom (accueil : tous les projets mélangés).
    const key = `${task.projectId}|${activityName(task).toLocaleLowerCase('fr')}`;
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return Array.from(groups.values()).map((slots) => {
    const withTarget = slots.filter((slot) => (slot.needed ?? 0) > 0);
    return {
      title: activityName(slots[0]),
      projectId: slots[0].projectId,
      tasks: slots,
      targetSlots: withTarget.length,
      fullSlots: withTarget.filter(isFull).length,
    };
  });
}
