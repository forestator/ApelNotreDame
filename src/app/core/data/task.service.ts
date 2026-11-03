import { inject, Injectable } from '@angular/core';
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
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NewTask, Task, TaskStatus } from '../models/task';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly collectionRef = collection(this.firestore, 'tasks');

  // Les volumes d'une APEL restent faibles : on écoute tout et on filtre côté client.
  readonly tasks = toSignal(
    this.auth.whenApproved(() => collectionData(this.collectionRef, { idField: 'id' }) as Observable<Task[]>, []),
    { initialValue: [] },
  );

  forCommission$(commissionId: string): Observable<Task[]> {
    return this.auth.whenApproved(
      () =>
        collectionData(query(this.collectionRef, where('commissionId', '==', commissionId)), {
          idField: 'id',
        }) as Observable<Task[]>,
      [],
    );
  }

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
    return this.patch(taskId, changes);
  }

  take(taskId: string, uid: string, displayName: string): Promise<void> {
    return this.patch(taskId, { assigneeUid: uid, assigneeName: displayName, status: 'in-progress' });
  }

  assign(taskId: string, member: { uid: string; displayName: string }): Promise<void> {
    return this.patch(taskId, { assigneeUid: member.uid, assigneeName: member.displayName });
  }

  addHelper(taskId: string, member: { uid: string; displayName: string }): Promise<void> {
    return updateDoc(doc(this.firestore, `tasks/${taskId}`), { [`helpers.${member.uid}`]: member.displayName });
  }

  removeHelper(taskId: string, uid: string): Promise<void> {
    return updateDoc(doc(this.firestore, `tasks/${taskId}`), { [`helpers.${uid}`]: deleteField() });
  }

  release(taskId: string): Promise<void> {
    return this.patch(taskId, { assigneeUid: null, assigneeName: null, status: 'todo' });
  }

  setStatus(taskId: string, status: TaskStatus): Promise<void> {
    return this.patch(taskId, { status });
  }

  /** Les commentaires sont une sous-collection : Firestore ne les supprime pas avec la tâche. */
  async remove(taskId: string): Promise<void> {
    const comments = await getDocs(collection(this.firestore, `tasks/${taskId}/comments`));
    const batch = writeBatch(this.firestore);
    comments.forEach((comment) => batch.delete(comment.ref));
    batch.delete(doc(this.firestore, `tasks/${taskId}`));
    await batch.commit();
  }

  private patch(taskId: string, changes: Partial<NewTask>): Promise<void> {
    return updateDoc(doc(this.firestore, `tasks/${taskId}`), changes);
  }
}
