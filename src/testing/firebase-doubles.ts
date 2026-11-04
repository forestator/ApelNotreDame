import { Subject } from 'rxjs';

/** Faux flux Firebase pilotés à la main par les tests (voir les vi.mock de auth.service.spec.ts). */
export const firebaseDoubles = {
  user$: new Subject<{ uid: string; photoURL: string | null } | null>(),
  docs: new Map<string, Subject<unknown>>(),

  doc$(path: string): Subject<unknown> {
    const existing = this.docs.get(path);
    if (existing) return existing;
    const created = new Subject<unknown>();
    this.docs.set(path, created);
    return created;
  },

  reset(): void {
    this.user$ = new Subject();
    this.docs.clear();
  },
};
