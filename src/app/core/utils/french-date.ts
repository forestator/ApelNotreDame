import { AbstractControl, ValidationErrors } from '@angular/forms';

const FRENCH_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** « 25/12/2026 » → « 2026-12-25 » (format stocké), ou null si la date n'existe pas. */
export function frenchDateToIso(value: string): string | null {
  const match = FRENCH_DATE.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const exists =
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day);
  return exists ? `${year}-${month}-${day}` : null;
}

/** « 2026-12-25 » → « 25/12/2026 » (affichage dans les champs de saisie). */
export function isoToFrenchDate(iso: string | null): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

// Le champ natif type="date" suit la langue du navigateur (mm/dd/yyyy en anglais) : on impose jj/mm/aaaa.
export function frenchDateValidator(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value || frenchDateToIso(control.value) ? null : { frenchDate: true };
}
