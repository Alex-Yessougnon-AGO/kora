/**
 * Formatage monétaire XOF / FCFA.
 * Le franc CFA n'a pas de sous-unité : on manipule exclusivement des entiers.
 */

const XOF_FORMATTER = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

function normalizeSpaces(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, ' ');
}

/** 18500 -> "18 500 FCFA" */
export function formatXof(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return `${normalizeSpaces(XOF_FORMATTER.format(safe))} FCFA`;
}

/** 18500 -> "18 500" (sans devise, pour les champs et tableaux denses) */
export function formatNumber(value: number): string {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return normalizeSpaces(XOF_FORMATTER.format(safe));
}

/** Format compact pour les axes de graphique : 1 250 000 -> "1,25 M FCFA" */
export function formatXofCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  }
  if (abs >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString('fr-FR')} k`;
  }
  return formatNumber(value);
}

/** Arrondit et borne un montant à un entier positif. */
export function toXof(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

/** "18 500 FCFA", "18.500", "18500,50" -> 18500 */
export function parseXof(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return toXof(raw);
  if (!raw) return 0;
  const cleaned = raw
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  return toXof(Number.isFinite(parsed) ? parsed : 0);
}

/** Pourcentage borné, arrondi à l'entier. */
export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function marginPercent(sellingPrice: number, purchasePrice: number): number {
  if (!sellingPrice) return 0;
  return Math.round(((sellingPrice - purchasePrice) / sellingPrice) * 100);
}
