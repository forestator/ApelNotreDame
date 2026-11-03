import { Timestamp } from '@angular/fire/firestore';

export interface TaskComment {
  id: string;
  authorUid: string;
  // Nom au moment de l'écriture : l'affichage préfère le nom à jour du membre.
  authorName: string;
  text: string;
  // null tant que le serveur n'a pas posé l'horodatage (écriture locale en attente).
  createdAt: Timestamp | null;
}
