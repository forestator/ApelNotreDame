import { inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  addDoc,
  collection,
  collectionData,
  deleteField,
  doc,
  Firestore,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NewTask, Task } from '../models/task';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly collectionRef = collection(this.firestore, 'tasks');

  // Les volumes d'une APEL restent faibles : on écoute tout et on filtre côté client.
  // Faux tant que la première réponse de Firestore n'est pas arrivée : permet d'afficher un loader plutôt qu'une liste vide.
  readonly loaded = signal(false);

  readonly tasks = toSignal(
    this.auth.whenApproved(
      () =>
        (collectionData(this.collectionRef, { idField: 'id' }) as Observable<Task[]>).pipe(
          tap(() => this.loaded.set(true)),
        ),
      [],
    ),
    { initialValue: [] },
  );

  forProject$(projectId: string): Observable<Task[]> {
    return this.auth.whenApproved(
      () =>
        collectionData(query(this.collectionRef, where('projectId', '==', projectId)), {
          idField: 'id',
        }) as Observable<Task[]>,
      [],
    );
  }

  async add(task: NewTask): Promise<void> {
    await addDoc(this.collectionRef, task);
  }

  update(taskId: string, changes: Partial<NewTask>): Promise<void> {
    return updateDoc(doc(this.firestore, `tasks/${taskId}`), changes);
  }

  register(taskId: string, member: { uid: string; displayName: string }): Promise<void> {
    return updateDoc(doc(this.firestore, `tasks/${taskId}`), { [`participants.${member.uid}`]: member.displayName });
  }

  unregister(taskId: string, uid: string): Promise<void> {
    return updateDoc(doc(this.firestore, `tasks/${taskId}`), { [`participants.${uid}`]: deleteField() });
  }

  /** Les commentaires sont une sous-collection : Firestore ne les supprime pas avec la tâche. */
  async remove(taskId: string): Promise<void> {
    const comments = await getDocs(collection(this.firestore, `tasks/${taskId}/comments`));
    const batch = writeBatch(this.firestore);
    comments.forEach((comment) => batch.delete(comment.ref));
    batch.delete(doc(this.firestore, `tasks/${taskId}`));
    await batch.commit();
  }
}
