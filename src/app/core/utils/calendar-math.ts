export const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
const pad = (value: number): string => String(value).padStart(2, '0');

/** Toutes les dates sont manipulées en UTC pour éviter tout décalage lié au fuseau ou à l'heure d'été. */
export function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export function monthLabel(year: number, month: number): string {
  return capitalize(MONTH_FORMAT.format(new Date(Date.UTC(year, month, 1))));
}

export function dayLabel(year: number, month: number, day: number): string {
  return capitalize(DAY_FORMAT.format(new Date(Date.UTC(year, month, day))));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Nombre de cases vides avant le 1er du mois, la semaine commençant le lundi. */
export function leadingBlanks(year: number, month: number): number {
  return (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
}

export function parseIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month: month - 1, day };
}

export function addDays(iso: string, days: number): string {
  const { year, month, day } = parseIso(iso);
  const moved = new Date(Date.UTC(year, month, day + days));
  return toIso(moved.getUTCFullYear(), moved.getUTCMonth(), moved.getUTCDate());
}

export function addMonths(iso: string, months: number): string {
  const { year, month, day } = parseIso(iso);
  const target = new Date(Date.UTC(year, month + months, 1));
  const clamped = Math.min(day, daysInMonth(target.getUTCFullYear(), target.getUTCMonth()));
  return toIso(target.getUTCFullYear(), target.getUTCMonth(), clamped);
}

export function todayIso(): string {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
}

/** « 2026-11-07 » → « Samedi 7 novembre ». */
export function longDayLabel(iso: string): string {
  const { year, month, day } = parseIso(iso);
  return dayLabel(year, month, day);
}
