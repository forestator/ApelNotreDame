import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { appStubs, makeTask } from '../../../testing/stubs';
import { groupByActivity } from '../../core/models/task';
import { addDays, todayIso } from '../../core/utils/calendar-math';
import { TaskSlot } from './task-slot';

describe('groupByActivity', () => {
  it('regroupe les créneaux de même titre et compte ceux qui sont complets', () => {
    const groups = groupByActivity([
      makeTask({
        id: 'a',
        title: 'Stand crêpes',
        date: '2026-11-07',
        time: '10:00',
        needed: 1,
        participants: { x: 'Anne' },
      }),
      makeTask({ id: 'b', title: ' stand crêpes ', date: '2026-11-07', time: '12:00', needed: 2 }),
      makeTask({ id: 'c', title: 'Tombola', date: '2026-11-08', needed: 0 }),
    ]);
    expect(groups.map((group) => group.title)).toEqual(['Stand crêpes', 'Tombola']);
    expect(groups[0]).toMatchObject({ targetSlots: 2, fullSlots: 1 });
    expect(groups[0].tasks.map((task) => task.id)).toEqual(['a', 'b']);
    expect(groups[1].targetSlots).toBe(0);
  });

  it('regroupe par activité des tâches de titres différents, sans toucher aux anciennes', () => {
    const groups = groupByActivity([
      makeTask({
        id: 'a',
        title: 'Samedi matin',
        activity: 'Père Noël',
        date: '2026-12-06',
        time: '10:00',
      }),
      makeTask({ id: 'b', title: 'Dimanche', activity: 'père noël ', date: '2026-12-07' }),
      makeTask({ id: 'c', title: 'Ancienne tâche', date: '2026-12-01' }),
    ]);
    expect(groups.map((group) => group.title)).toEqual(['Ancienne tâche', 'Père Noël']);
    expect(groups[1].tasks.map((task) => task.id)).toEqual(['a', 'b']);
  });
});

describe('TaskSlot', () => {
  it("affiche l'effectif et les inscrits, et permet de s'inscrire", async () => {
    const task = makeTask({
      date: addDays(todayIso(), 3),
      time: '10:00',
      needed: 3,
      participants: { 'mock-kevin': 'Kevin' },
    });
    const stubs = appStubs({ tasks: [task] });
    TestBed.configureTestingModule({ imports: [TaskSlot], providers: stubs.providers });
    const fixture = TestBed.createComponent(TaskSlot);
    fixture.componentRef.setInput('task', task);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('1/3');
    expect(element.textContent).toContain('manque 2');
    expect(element.textContent).toContain('Kevin');
    element.querySelector('button')?.click();
    expect(stubs.taskService.register).toHaveBeenCalled();
  });
});
