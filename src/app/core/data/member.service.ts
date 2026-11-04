import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  collection,
  collectionData,
  deleteDoc,
  deleteField,
  doc,
  FieldPath,
  Firestore,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Member, MemberRole } from '../models/member';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  readonly loaded = signal(false);

  readonly members = toSignal(
    this.auth.whenApproved(
      () =>
        (
          collectionData(query(collection(this.firestore, 'members'), orderBy('displayName'))) as Observable<Member[]>
        ).pipe(tap(() => this.loaded.set(true))),
      [],
    ),
    { initialValue: [] },
  );

  // Nom et photo à jour d'un membre : les noms copiés dans les tâches ne servent que de repli.
  readonly profiles = computed(() => new Map(this.members().map((member) => [member.uid, member])));
  // Tous les membres affectables, fiches provisoires comprises.
  readonly approved = computed(() => this.members().filter((member) => member.status === 'approved'));
  readonly realApproved = computed(() => this.approved().filter((member) => !member.mock));
  readonly placeholders = computed(() => this.approved().filter((member) => member.mock));
  readonly pending = computed(() => this.members().filter((member) => member.status === 'pending'));

  approve(uid: string): Promise<void> {
    return updateDoc(doc(this.firestore, `members/${uid}`), { status: 'approved' });
  }

  setRole(uid: string, role: MemberRole): Promise<void> {
    return updateDoc(doc(this.firestore, `members/${uid}`), { role });
  }

  remove(uid: string): Promise<void> {
    return deleteDoc(doc(this.firestore, `members/${uid}`));
  }

  async addPlaceholder(displayName: string): Promise<void> {
    const uid = `mock-${crypto.randomUUID().slice(0, 8)}`;
    const placeholder: Member = {
      uid,
      displayName,
      email: '',
      photoURL: null,
      role: 'member',
      status: 'approved',
      mock: true,
    };
    await setDoc(doc(this.firestore, `members/${uid}`), placeholder);
  }

  /**
   * Retire une fiche provisoire. Avec `target`, ses inscriptions passent au vrai compte ;
   * sans cible, elle est simplement retirée des tâches.
   */
  async retirePlaceholder(placeholderUid: string, target?: Member): Promise<void> {
    const batch = writeBatch(this.firestore);
    // participants est une table uid → nom : on retrouve les tâches où la fiche figure en filtrant sur sa clé.
    const involved = await getDocs(
      query(collection(this.firestore, 'tasks'), where(new FieldPath('participants', placeholderUid), '>=', '')),
    );
    involved.forEach((task) => {
      const alreadyRegistered = target ? target.uid in (task.data()['participants'] ?? {}) : false;
      batch.update(task.ref, {
        [`participants.${placeholderUid}`]: deleteField(),
        ...(target && !alreadyRegistered ? { [`participants.${target.uid}`]: target.displayName } : {}),
      });
    });
    batch.delete(doc(this.firestore, `members/${placeholderUid}`));
    await batch.commit();
  }
}
