import { inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  addDoc,
  collection,
  collectionData,
  doc,
  docData,
  Firestore,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NewProject, Project } from '../models/project';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly collectionRef = collection(this.firestore, 'projects');

  readonly loaded = signal(false);

  readonly projects = toSignal(
    this.auth.whenApproved(
      () =>
        (collectionData(query(this.collectionRef, orderBy('name')), { idField: 'id' }) as Observable<Project[]>).pipe(
          tap(() => this.loaded.set(true)),
        ),
      [],
    ),
    { initialValue: [] },
  );

  project$(id: string): Observable<Project | undefined> {
    return this.auth.whenApproved(
      () => docData(doc(this.firestore, `projects/${id}`), { idField: 'id' }) as Observable<Project | undefined>,
      undefined,
    );
  }

  async add(project: NewProject): Promise<void> {
    await addDoc(this.collectionRef, project);
  }

  update(id: string, changes: Partial<NewProject>): Promise<void> {
    return updateDoc(doc(this.firestore, `projects/${id}`), changes);
  }

  /** Supprime aussi les tâches du projet (et leurs commentaires) : une tâche vit toujours dans un projet. */
  async remove(id: string): Promise<void> {
    const tasks = await getDocs(query(collection(this.firestore, 'tasks'), where('projectId', '==', id)));
    const comments = await Promise.all(
      tasks.docs.map((task) => getDocs(collection(this.firestore, `tasks/${task.id}/comments`))),
    );
    const batch = writeBatch(this.firestore);
    comments.forEach((snapshot) => snapshot.forEach((comment) => batch.delete(comment.ref)));
    tasks.forEach((task) => batch.delete(task.ref));
    batch.delete(doc(this.firestore, `projects/${id}`));
    await batch.commit();
  }
}
