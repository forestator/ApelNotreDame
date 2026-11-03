export type TaskStatus = 'todo' | 'in-progress' | 'done';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'À faire',
  'in-progress': 'En cours',
  done: 'Terminée',
};

export interface Task {
  id: string;
  // Un projet (ex. le cirque) rassemble des tâches de plusieurs commissions.
  projectId: string | null;
  commissionId: string;
  title: string;
  description: string;
  status: TaskStatus;
  // null = tâche libre, que n'importe quel membre peut prendre
  assigneeUid: string | null;
  assigneeName: string | null;
  // Personnes qui aident en plus du responsable (uid → nom), ex. montage du chapiteau.
  helpers: Record<string, string>;
  // Nombre d'aidants recherchés (0 = pas de besoin particulier).
  helpersNeeded: number;
  // Nombre de commentaires, tenu à jour à chaque ajout ou suppression.
  commentCount?: number;
  dueDate: string | null;
  createdBy: string;
}

export type NewTask = Omit<Task, 'id'>;
