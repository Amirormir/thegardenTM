/** Utilitaires numériques partagés par la note et le moteur de valeur. */

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** lo -> 0, hi -> 1, borné [0,1]. */
export function norm(x: number, lo: number, hi: number): number {
  if (hi <= lo) return 0;
  return clamp((x - lo) / (hi - lo), 0, 1);
}

/** c -> 0.5 ; s = demi-amplitude ; borné [0,1]. */
export function normSigned(x: number, c: number, s: number): number {
  return clamp(0.5 + (x - c) / (2 * s), 0, 1);
}

/** Arrondi à `decimals` décimales (defaut 1), comme `round(x, 1)` en Python. */
export function roundTo(x: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(x * factor) / factor;
}
