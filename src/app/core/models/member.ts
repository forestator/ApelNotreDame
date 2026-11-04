export type MemberRole = 'admin' | 'member';
export type MemberStatus = 'pending' | 'approved';

export interface Member {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  role: MemberRole;
  status: MemberStatus;
  // Notifications par e-mail (quand quelqu'un d'autre vous inscrit à une tâche) ; activées par défaut.
  emailNotifications?: boolean;
  // Personne sans compte Google (uid « mock-… ») : un admin la remplace par le vrai compte quand il existe.
  mock?: boolean;
}
