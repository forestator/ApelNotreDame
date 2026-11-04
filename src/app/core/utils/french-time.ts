import { AbstractControl, ValidationErrors } from '@angular/forms';

const TIME = /^(\d{1,2})\s*[:hH]\s*(\d{2})?$/;

/** Accepte « 9h30 », « 9:30 », « 09:30 » ou « 9h » et renvoie « 09:30 » (format stocké), ou null. */
export function normalizeTime(value: string): string | null {
  const match = TIME.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** « 09:30 » → « 9h30 », « 14:00 » → « 14h ». */
export function formatTime(time: string | null): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  return minutes === '00' ? `${Number(hours)}h` : `${Number(hours)}h${minutes}`;
}

// Le champ natif type="time" affiche AM/PM sur un navigateur en anglais : on impose un format simple.
export function timeValidator(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value || normalizeTime(control.value) ? null : { time: true };
}
