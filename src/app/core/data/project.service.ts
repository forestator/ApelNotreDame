import { inject, Injectable } from '@angular/core';
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
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NewProject, Project } from '../models/project';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly collectionRef = collection(this.firestore, 'projects');

  readonly projects = toSignal(
    this.auth.whenApproved(
      () => collectionData(query(this.collectionRef, orderBy('name')), { idField: 'id' }) as Observable<Project[]>,
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

  /** Les tâches appartiennent aussi à une commission : elles sont détachées du projet, pas supprimées. */
  async remove(id: string): Promise<void> {
    const tasks = await getDocs(query(collection(this.firestore, 'tasks'), where('projectId', '==', id)));
    const batch = writeBatch(this.firestore);
    tasks.forEach((task) => batch.update(task.ref, { projectId: null }));
    batch.delete(doc(this.firestore, `projects/${id}`));
    await batch.commit();
  }
}
