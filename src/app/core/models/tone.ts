// Doit rester aligné avec $commission-tones dans src/styles/_variables.scss.
export const TONES = [
  { key: 'teal', label: 'Turquoise' },
  { key: 'blue', label: 'Bleu' },
  { key: 'purple', label: 'Violet' },
  { key: 'magenta', label: 'Magenta' },
  { key: 'red', label: 'Rouge' },
  { key: 'orange', label: 'Orange' },
  { key: 'green', label: 'Vert' },
  { key: 'slate', label: 'Gris' },
] as const;

export type Tone = (typeof TONES)[number]['key'];

/** Classe CSS exposant la couleur d'une commission ou d'un projet (turquoise à défaut). */
export function toneClass(color?: string): string {
  return `tone-${color ?? 'teal'}`;
}
