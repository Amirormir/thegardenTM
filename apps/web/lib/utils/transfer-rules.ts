// Regles economiques transversales du marche des transferts.
// Partage entre routers tRPC (serveur) et composants UI (client) — aucun
// import serveur ici pour rester importable des deux cotes.

/**
 * Valeur marchande de base par palier de cost (1-5). Utilisee comme valeur
 * marchande par defaut lorsqu'un admin attribue un cost a un joueur. Reste
 * librement modifiable ensuite.
 */
export const COST_BASE_VALUE: Record<number, number> = {
  1: 10_000_000,
  2: 20_000_000,
  3: 30_000_000,
  4: 40_000_000,
  5: 55_000_000,
};

/** Valeur de base d'un cost, avec repli sur le cost 1 si hors plage. */
export function getCostBaseValue(cost: number): number {
  return COST_BASE_VALUE[cost] ?? COST_BASE_VALUE[1]!;
}

/**
 * Plancher du prix de transfert et de la clause liberatoire, exprime en
 * fraction de la valeur marchande du joueur. Une offre ne peut pas descendre
 * sous ce seuil, et la clause liberatoire s'y aligne automatiquement.
 */
export const MIN_TRANSFER_VALUE_RATIO = 0.5;

/**
 * Plancher entier (>= 50% de la valeur marchande). Arrondi au superieur pour
 * garantir le respect strict du seuil.
 */
export function getTransferFloor(marketValue: number): number {
  const value = Number.isFinite(marketValue) ? marketValue : 0;
  return Math.ceil(Math.max(0, value) * MIN_TRANSFER_VALUE_RATIO);
}
