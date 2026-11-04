import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firebaseDoubles } from '../../../testing/firebase-doubles';
import { AuthService } from './auth.service';

vi.mock('@angular/fire/auth', async () => {
  const { firebaseDoubles: doubles } = await import('../../../testing/firebase-doubles');
  return {
    Auth: class {},
    GoogleAuthProvider: class {},
    authState: () => doubles.user$.asObservable(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock('@angular/fire/firestore', async () => {
  const { firebaseDoubles: doubles } = await import('../../../testing/firebase-doubles');
  return {
    Firestore: class {},
    doc: (_firestore: unknown, path: string) => path,
    docData: (path: string) => doubles.doc$(path).asObservable(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
  };
});

const approvedMember = { uid: 'u1', displayName: 'Maximilien', status: 'approved', role: 'member', email: '', photoURL: null };

describe('AuthService', () => {
  beforeEach(() => {
    firebaseDoubles.reset();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: {} },
        { provide: Firestore, useValue: {} },
      ],
    });
  });

  it('reste en chargement tant que la fiche membre n\'est pas arrivée, juste après la connexion', () => {
    const auth = TestBed.inject(AuthService);

    firebaseDoubles.user$.next(null);
    expect(auth.status()).toBe('anonymous');

    // Connexion Google : la fiche membre n'a pas encore été lue.
    // Si le statut passait par « unregistered », le guard renverrait vers /connexion (il faudrait recliquer).
    firebaseDoubles.user$.next({ uid: 'u1', photoURL: null });
    expect(auth.status()).toBe('loading');

    firebaseDoubles.doc$('members/u1').next(approvedMember);
    expect(auth.status()).toBe('approved');
  });

  it('whenResolved attend le statut définitif après la connexion', async () => {
    const auth = TestBed.inject(AuthService);
    firebaseDoubles.user$.next(null);
    TestBed.tick();

    firebaseDoubles.user$.next({ uid: 'u1', photoURL: null });
    const resolved = firstValueFrom(auth.whenResolved());
    TestBed.tick();
    firebaseDoubles.doc$('members/u1').next(approvedMember);
    TestBed.tick();

    expect(await resolved).toBe('approved');
  });

  it('signale « unregistered » quand la fiche n\'existe vraiment pas', () => {
    const auth = TestBed.inject(AuthService);
    firebaseDoubles.user$.next({ uid: 'u2', photoURL: null });
    firebaseDoubles.doc$('members/u2').next(undefined);
    expect(auth.status()).toBe('unregistered');
  });

  it('passe en « pending » pour un compte en attente', () => {
    const auth = TestBed.inject(AuthService);
    firebaseDoubles.user$.next({ uid: 'u3', photoURL: null });
    firebaseDoubles.doc$('members/u3').next({ ...approvedMember, uid: 'u3', status: 'pending' });
    expect(auth.status()).toBe('pending');
  });
});
