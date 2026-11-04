import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { appStubs, makeProject, makeTask } from '../../../testing/stubs';
import { todayIso } from '../../core/utils/calendar-math';
import { Calendar } from './calendar';

async function render(loaded = true) {
  const today = todayIso();
  const stubs = appStubs({
    loaded,
    projects: [makeProject({ dueDate: today })],
    tasks: [
      makeTask({ id: 'a', title: 'Montage du jour', date: today, time: '09:30', needed: 6, participants: { me: 'Maximilien' } }),
      makeTask({ id: 'b', title: 'Sans date', date: null }),
    ],
  });
  TestBed.configureTestingModule({ imports: [Calendar], providers: [provideRouter([]), ...stubs.providers] });
  const fixture = TestBed.createComponent(Calendar);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('Calendar', () => {
  it('place les tâches datées dans la grille, avec heure et remplissage, et le projet daté', async () => {
    const element = await render();
    const events = Array.from(element.querySelectorAll('.event')).map((event) => event.textContent?.replace(/\s+/g, ' ').trim());
    expect(events.some((text) => text?.includes('Montage du jour') && text.includes('9h30') && text.includes('1/6'))).toBe(true);
    expect(events.some((text) => text?.includes('Cirque') && text.includes('Date du projet'))).toBe(true);
    expect(events.some((text) => text?.includes('Sans date'))).toBe(false);
  });

  it('affiche un loader pendant le chargement et pas « aucune échéance »', async () => {
    const element = await render(false);
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Chargement');
    expect(element.textContent).not.toContain('Aucune échéance ce mois-ci');
  });
});
