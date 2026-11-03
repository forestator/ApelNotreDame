import { computed, inject, Injectable } from '@angular/core';
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
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Member, MemberRole } from '../models/member';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  readonly members = toSignal(
    this.auth.whenApproved(
      () =>
        collectionData(query(collection(this.firestore, 'members'), orderBy('displayName'))) as Observable<Member[]>,
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
      emailNotifications: false,
      mock: true,
    };
    await setDoc(doc(this.firestore, `members/${uid}`), placeholder);
  }

  /**
   * Retire une fiche provisoire. Avec `target`, ses responsabilités (tâches, rôle d'aidant, commissions)
   * passent au vrai compte ; sans cible, elles sont simplement libérées.
   */
  async retirePlaceholder(placeholderUid: string, target?: Member): Promise<void> {
    const tasks = collection(this.firestore, 'tasks');
    const batch = writeBatch(this.firestore);

    const assigned = await getDocs(query(tasks, where('assigneeUid', '==', placeholderUid)));
    assigned.forEach((task) =>
      batch.update(
        task.ref,
        target
          ? { assigneeUid: target.uid, assigneeName: target.displayName }
          : { assigneeUid: null, assigneeName: null },
      ),
    );

    // helpers est une table uid → nom : on retrouve les tâches où la fiche figure en filtrant sur sa clé.
    const helped = await getDocs(query(tasks, where(new FieldPath('helpers', placeholderUid), '>=', '')));
    helped.forEach((task) => {
      const alreadyResponsible = task.data()['assigneeUid'] === target?.uid;
      batch.update(task.ref, {
        [`helpers.${placeholderUid}`]: deleteField(),
        ...(target && !alreadyResponsible ? { [`helpers.${target.uid}`]: target.displayName } : {}),
      });
    });

    const led = await getDocs(query(collection(this.firestore, 'commissions'), where('leadUid', '==', placeholderUid)));
    led.forEach((commission) =>
      batch.update(
        commission.ref,
        target ? { leadUid: target.uid, leadName: target.displayName } : { leadUid: null, leadName: null },
      ),
    );

    batch.delete(doc(this.firestore, `members/${placeholderUid}`));
    await batch.commit();
  }
}
