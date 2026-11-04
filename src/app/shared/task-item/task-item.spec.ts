import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { appStubs, ME, makeProject, makeTask } from '../../../testing/stubs';
import { addDays, todayIso } from '../../core/utils/calendar-math';
import { Task } from '../../core/models/task';
import { TaskItem } from './task-item';

async function render(task: Task, options: { isAdmin?: boolean } = {}) {
  const stubs = appStubs({ tasks: [task], projects: [makeProject()], isAdmin: options.isAdmin });
  TestBed.configureTestingModule({ imports: [TaskItem], providers: [provideRouter([]), ...stubs.providers] });
  const fixture = TestBed.createComponent(TaskItem);
  fixture.componentRef.setInput('task', task);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const buttonLabelled = (label: string) =>
    Array.from(element.querySelectorAll('button')).find((button) => button.textContent?.includes(label));
  return { fixture, element, stubs, text: element.textContent ?? '', buttonLabelled };
}

const upcoming = () => addDays(todayIso(), 4);

describe('TaskItem', () => {
  it('montre la date, l\'heure, l\'effectif et ce qui manque', async () => {
    const { text } = await render(
      makeTask({ date: '2026-11-07', time: '09:30', needed: 6, extraPeople: 3, participants: { 'mock-kevin': 'Kevin' } }),
    );
    expect(text).toContain('Samedi 7 novembre');
    expect(text).toContain('9h30');
    expect(text).toContain('4/6');
    expect(text).toContain('Il manque 2');
    expect(text).toContain('Kevin');
    expect(text).toContain('3 prévu(s) hors application');
  });

  it('indique « Complet » quand l\'effectif est atteint', async () => {
    const { text } = await render(makeTask({ date: upcoming(), needed: 2, participants: { a: 'Anne', b: 'Bob' } }));
    expect(text).toContain('Complet');
    expect(text).not.toContain('Il manque');
  });

  it('« Je suis là » inscrit l\'utilisateur courant', async () => {
    const { buttonLabelled, stubs } = await render(makeTask({ date: upcoming(), needed: 3 }));
    buttonLabelled('Je suis là')?.click();
    expect(stubs.taskService.register).toHaveBeenCalledWith('task-1', expect.objectContaining({ uid: ME.uid }));
  });

  it('propose de se retirer quand on est déjà inscrit', async () => {
    const { buttonLabelled, stubs } = await render(
      makeTask({ date: upcoming(), needed: 3, participants: { [ME.uid]: ME.displayName } }),
    );
    expect(buttonLabelled('Je suis là')).toBeUndefined();
    buttonLabelled('me retirer')?.click();
    expect(stubs.taskService.unregister).toHaveBeenCalledWith('task-1', ME.uid);
  });

  it('n\'offre plus l\'inscription pour une tâche passée', async () => {
    const { buttonLabelled, text } = await render(makeTask({ date: '2020-01-01', needed: 3 }));
    expect(text).toContain('Passé');
    expect(buttonLabelled('Je suis là')).toBeUndefined();
  });

  it('affiche une erreur visible quand l\'écriture est refusée', async () => {
    const { buttonLabelled, stubs, fixture, element } = await render(makeTask({ date: upcoming(), needed: 3 }));
    stubs.taskService.register.mockRejectedValueOnce(new Error('permission-denied'));
    buttonLabelled('Je suis là')?.click();
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain("n'a pas pu être enregistrée");
  });

  it('réserve « Gérer » à un admin ou au créateur de la tâche', async () => {
    const asMember = await render(makeTask({ date: upcoming(), createdBy: 'someone' }));
    expect(asMember.buttonLabelled('Gérer')).toBeUndefined();
    TestBed.resetTestingModule();
    const asAdmin = await render(makeTask({ date: upcoming(), createdBy: 'someone' }), { isAdmin: true });
    expect(asAdmin.buttonLabelled('Gérer')).toBeDefined();
    TestBed.resetTestingModule();
    const asCreator = await render(makeTask({ date: upcoming(), createdBy: ME.uid }));
    expect(asCreator.buttonLabelled('Gérer')).toBeDefined();
  });
});
