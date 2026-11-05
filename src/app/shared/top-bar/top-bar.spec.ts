import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { appStubs } from '../../../testing/stubs';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  it('salue le membre et propose le choix de vue', async () => {
    TestBed.configureTestingModule({ imports: [TopBar], providers: appStubs().providers });
    const fixture = TestBed.createComponent(TopBar);
    await fixture.whenStable();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Bonjour Maximilien');
    expect(text).toContain('Vue condensée');
    expect(text).toContain('Vue détaillée');
  });
});
