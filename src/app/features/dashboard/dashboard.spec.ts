import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { addDays, todayIso } from '../../core/utils/calendar-math';
import { appStubs, makeProject, makeTask } from '../../../testing/stubs';
import { Dashboard } from './dashboard';

async function render(tasks = [] as ReturnType<typeof makeTask>[], loaded = true) {
  const stubs = appStubs({ tasks, loaded, projects: [makeProject(), makeProject({ id: 'project-2', name: 'Marché' })] });
  TestBed.configureTestingModule({ imports: [Dashboard], providers: [provideRouter([]), ...stubs.providers] });
  const fixture = TestBed.createComponent(Dashboard);
  await fixture.whenStable();
  const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
  return { fixture, text, element: fixture.nativeElement as HTMLElement };
}

describe('Dashboard', () => {
  it('affiche toutes les sections et les tâches, sans planter', async () => {
    const today = todayIso();
    const { text, element } = await render([
      makeTask({ id: 'a', title: 'Besoin de monde', date: addDays(today, 3), needed: 4 }),
      makeTask({ id: 'b', title: 'Ma tâche', date: addDays(today, 5), needed: 4, participants: { me: 'Maximilien' } }),
      makeTask({ id: 'c', title: 'Sans date', date: null }),
      makeTask({ id: 'd', title: 'Déjà complète', date: addDays(today, 2), needed: 1, participants: { x: 'Autre' } }),
    ]);

    expect(text).toContain('Bonjour Maximilien');
    // Les compteurs ET les listes doivent s'afficher : un compteur qui plante masquerait tout ce qui suit.
    expect(text).toContain('Mes prochaines inscriptions');
    expect(text).toContain('On a besoin de vous');
    expect(text).toContain('À planifier');

    const sectionOf = (headingId: string) =>
      element.querySelector(`section[aria-labelledby="${headingId}"]`)?.textContent ?? '';
    expect(sectionOf('mine-title')).toContain('Ma tâche');
    expect(sectionOf('needs-title')).toContain('Besoin de monde');
    expect(sectionOf('needs-title')).not.toContain('Déjà complète');
    expect(sectionOf('needs-title')).not.toContain('Ma tâche');
    expect(sectionOf('schedule-title')).toContain('Sans date');
  });

  it('affiche les compteurs avec le nombre de projets', async () => {
    const { element } = await render([]);
    const tiles = Array.from(element.querySelectorAll('.stat-tile')).map((tile) => tile.textContent?.replace(/\s+/g, ' ').trim());
    expect(tiles).toHaveLength(3);
    expect(tiles.at(-1)).toContain('2');
  });

  it('affiche un loader (et pas de liste vide) tant que les données ne sont pas arrivées', async () => {
    const { element, text } = await render([], false);
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Chargement');
    expect(text).not.toContain('Vous n\'êtes inscrit·e à rien');
    expect(element.querySelector('.stat-grid')).toBeNull();
  });
});
