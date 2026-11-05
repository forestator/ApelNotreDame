import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { appStubs } from '../../../testing/stubs';
import { Shell } from './shell';

describe('Shell', () => {
  async function render() {
    const stubs = appStubs();
    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideRouter([]), ...stubs.providers],
    });
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    return { element: fixture.nativeElement as HTMLElement, fixture };
  }

  it('ouvre et ferme le menu avec le bouton, et le ferme avec Échap', async () => {
    const { element, fixture } = await render();
    const toggle = element.querySelector<HTMLButtonElement>('.shell-toggle') as HTMLButtonElement;
    const side = element.querySelector('.shell-side') as HTMLElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    await fixture.whenStable();
    expect(side.classList).toContain('shell-side-open');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(side.classList).not.toContain('shell-side-open');
  });

  it('propose les liens principaux et Instagram', async () => {
    const { element } = await render();
    const text = element.textContent ?? '';
    for (const label of ['Accueil', 'Projets', 'Calendrier', 'Instagram', 'Déconnexion'])
      expect(text).toContain(label);
    expect(
      element.querySelector('a[href*="instagram.com/apelnotredamemontfortsurmeu"]'),
    ).not.toBeNull();
  });
});
