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
import { Commission, NewCommission } from '../models/commission';

@Injectable({ providedIn: 'root' })
export class CommissionService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly collectionRef = collection(this.firestore, 'commissions');

  readonly commissions = toSignal(
    this.auth.whenApproved(
      () => collectionData(query(this.collectionRef, orderBy('name')), { idField: 'id' }) as Observable<Commission[]>,
      [],
    ),
    { initialValue: [] },
  );

  commission$(id: string): Observable<Commission | undefined> {
    return this.auth.whenApproved(
      () =>
        docData(doc(this.firestore, `commissions/${id}`), { idField: 'id' }) as Observable<
          Commission | undefined
        >,
      undefined,
    );
  }

  async add(commission: NewCommission): Promise<void> {
    await addDoc(this.collectionRef, commission);
  }

  update(id: string, changes: Partial<NewCommission>): Promise<void> {
    return updateDoc(doc(this.firestore, `commissions/${id}`), changes);
  }

  /** Supprime aussi ses tâches, pour ne pas laisser d'orphelines dans « Tâches à prendre ». */
  async remove(id: string): Promise<void> {
    const tasks = await getDocs(query(collection(this.firestore, 'tasks'), where('commissionId', '==', id)));
    const batch = writeBatch(this.firestore);
    const comments = await Promise.all(tasks.docs.map((task) => getDocs(collection(this.firestore, `tasks/${task.id}/comments`))));
    comments.forEach((snapshot) => snapshot.forEach((comment) => batch.delete(comment.ref)));
    tasks.forEach((task) => batch.delete(task.ref));
    batch.delete(doc(this.firestore, `commissions/${id}`));
    await batch.commit();
  }
}
