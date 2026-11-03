import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  increment,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { TaskComment } from '../models/comment';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  comments$(taskId: string): Observable<TaskComment[]> {
    return this.auth.whenApproved(
      () =>
        collectionData(query(collection(this.firestore, `tasks/${taskId}/comments`), orderBy('createdAt')), {
          idField: 'id',
        }) as Observable<TaskComment[]>,
      [],
    );
  }

  async add(taskId: string, text: string): Promise<void> {
    const member = this.auth.member();
    if (!member) return;
    // Commentaire et compteur sont écrits ensemble pour ne jamais diverger.
    const batch = writeBatch(this.firestore);
    batch.set(doc(collection(this.firestore, `tasks/${taskId}/comments`)), {
      authorUid: member.uid,
      authorName: member.displayName,
      text,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(this.firestore, `tasks/${taskId}`), { commentCount: increment(1) });
    await batch.commit();
  }

  async remove(taskId: string, commentId: string): Promise<void> {
    const batch = writeBatch(this.firestore);
    batch.delete(doc(this.firestore, `tasks/${taskId}/comments/${commentId}`));
    batch.update(doc(this.firestore, `tasks/${taskId}`), { commentCount: increment(-1) });
    await batch.commit();
  }
}
