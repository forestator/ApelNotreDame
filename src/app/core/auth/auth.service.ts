import { computed, effect, inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Auth, authState, GoogleAuthProvider, signInWithPopup, signOut } from '@angular/fire/auth';
import { doc, docData, Firestore, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { distinctUntilChanged, map, Observable, of, startWith, switchMap } from 'rxjs';
import { Member } from '../models/member';

// 'unregistered' : connecté à Google mais sans fiche membre (refusé par un admin, ou création échouée).
export type AuthStatus = 'loading' | 'anonymous' | 'unregistered' | 'pending' | 'approved';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);

  // undefined = pas encore résolu, null = non connecté
  private readonly firebaseUser = toSignal(authState(this.auth));

  // undefined = en chargement, null = pas de fiche membre
  readonly member = toSignal(
    authState(this.auth).pipe(
      switchMap((user) =>
        user
          ? (docData(doc(this.firestore, `members/${user.uid}`)) as Observable<Member | undefined>).pipe(
              map((member) => member ?? null),
              // À chaque changement d'utilisateur, on repasse en « chargement » : sans cela, l'ancienne valeur
              // (null quand on était déconnecté) ferait croire à un compte sans fiche et renverrait vers la connexion.
              startWith(undefined),
            )
          : of(null),
      ),
    ),
  );

  readonly status = computed<AuthStatus>(() => {
    if (this.firebaseUser() === undefined) return 'loading';
    if (this.firebaseUser() === null) return 'anonymous';
    const member = this.member();
    if (member === undefined) return 'loading';
    return member === null ? 'unregistered' : member.status;
  });

  private readonly approved$ = toObservable(this.status).pipe(
    map((status) => status === 'approved'),
    distinctUntilChanged(),
  );

  readonly isAdmin = computed(() => {
    const member = this.member();
    return member?.status === 'approved' && member.role === 'admin';
  });

  readonly googlePhotoURL = computed(() => this.firebaseUser()?.photoURL ?? null);

  readonly uid = computed(() => this.firebaseUser()?.uid ?? null);

  /**
   * Émet une seule fois, dès que le statut n'est plus 'loading'.
   * Lit le statut au moment où l'effet s'exécute (et non une valeur mémorisée) : un guard ne voit jamais un état périmé.
   */
  whenResolved(): Observable<AuthStatus> {
    return new Observable<AuthStatus>((subscriber) => {
      const watcher = effect(
        () => {
          const status = this.status();
          if (status === 'loading') return;
          subscriber.next(status);
          subscriber.complete();
        },
        { injector: this.injector },
      );
      return () => watcher.destroy();
    });
  }

  /**
   * Les flux Firestore ne doivent tourner que pour un membre approuvé : à la déconnexion
   * (ou au retrait du membre), les règles les couperaient en permission-denied.
   */
  whenApproved<T>(source: () => Observable<T>, fallback: T): Observable<T> {
    return this.approved$.pipe(
      switchMap((approved) => (approved ? runInInjectionContext(this.injector, source) : of(fallback))),
    );
  }

  async signInWithGoogle(): Promise<void> {
    const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
    await this.ensureMember(credential.user);
  }

  /** Un membre ne peut modifier que son nom, sa photo et ses préférences (cf. firestore.rules). */
  updateProfile(changes: Partial<Pick<Member, 'displayName' | 'photoURL'>>): Promise<void> {
    const uid = this.uid();
    return uid ? updateDoc(doc(this.firestore, `members/${uid}`), changes) : Promise.resolve();
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }

  // Premier login : le compte reste « pending » tant qu'un admin ne l'a pas approuvé.
  private async ensureMember(user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  }): Promise<void> {
    const ref = doc(this.firestore, `members/${user.uid}`);
    if ((await getDoc(ref)).exists()) return;
    const member: Member = {
      uid: user.uid,
      displayName: user.displayName ?? user.email ?? 'Membre',
      email: user.email ?? '',
      photoURL: user.photoURL,
      role: 'member',
      status: 'pending',
    };
    await setDoc(ref, member);
  }
}
