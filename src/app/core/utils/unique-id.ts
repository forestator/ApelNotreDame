let counter = 0;

/** Identifiant DOM unique, pour que plusieurs formulaires identiques cohabitent sur une page (labels, aria). */
export function uniqueId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
