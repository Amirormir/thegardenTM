/**
 * Moteur de cotes — fonctions pures, sans I/O.
 *
 * Principe directeur : les cotes d'un match dependent UNIQUEMENT de l'ecart de
 * force (rating Elo) entre les deux equipes, jamais de leur force absolue.
 * Deux equipes de niveau proche -> ~1.90 / 1.90, que ce soit le duel des deux
 * favorites ou celui des deux dernieres.
 */

export interface BettingEngineConfig {
  margin: number;
  k: number;
  warmupGames: number;
  seedRatingMin: number;
  seedRatingMax: number;
  probClampMin: number;
  probClampMax: number;
}

export const DEFAULT_ENGINE_CONFIG: BettingEngineConfig = {
  margin: 0.06,
  k: 24,
  warmupGames: 2,
  seedRatingMin: 1300,
  seedRatingMax: 1700,
  probClampMin: 0.1,
  probClampMax: 0.9,
};

export const BASE_RATING = 1500;
export const MIN_ODDS = 1.01;

/** Probabilite "fair" (sans clamp ni marge) que A batte B sur l'echelle Elo. */
export function winProbability(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/** Borne une probabilite dans [min, max]. */
export function clampProb(p: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, p));
}

/** Arrondi a 2 decimales. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Probabilite (deja clampee) -> cote avec marge bookmaker (overround).
 * bookedP = p * (1 + margin) ; cote = round(1 / bookedP, 2), plancher MIN_ODDS.
 */
export function probToOdds(clampedProb: number, margin: number): number {
  const bookedProb = clampedProb * (1 + margin);
  const odds = round2(1 / bookedProb);
  return Math.max(MIN_ODDS, odds);
}

export interface ComputedOdds {
  /** Probas "fair" (non clampees, sans marge) — servent au E(i) de l'Elo. */
  probHome: number;
  probAway: number;
  oddsHome: number;
  oddsAway: number;
}

/**
 * Ratings des deux equipes -> probas fair + cotes (clampees + marge).
 */
export function computeOdds(input: {
  ratingHome: number;
  ratingAway: number;
  margin: number;
  clampMin: number;
  clampMax: number;
}): ComputedOdds {
  const probHome = winProbability(input.ratingHome, input.ratingAway);
  const probAway = 1 - probHome;

  const clampedHome = clampProb(probHome, input.clampMin, input.clampMax);
  const clampedAway = clampProb(probAway, input.clampMin, input.clampMax);

  return {
    probHome,
    probAway,
    oddsHome: probToOdds(clampedHome, input.margin),
    oddsAway: probToOdds(clampedAway, input.margin),
  };
}

/**
 * Seeding de presaison : equipes ordonnees de la plus favorite (rang 1) a la
 * moins favorite. Ratings regulierement espaces entre [seedMin, seedMax].
 * Un override force le rating d'une equipe donnee.
 */
export function seedRatings(
  orderedTeamIds: string[],
  options: {
    seedMin: number;
    seedMax: number;
    overrides?: Record<string, number>;
  },
): Map<string, number> {
  const { seedMin, seedMax, overrides } = options;
  const n = orderedTeamIds.length;
  const result = new Map<string, number>();

  orderedTeamIds.forEach((teamId, index) => {
    const override = overrides?.[teamId];
    if (override !== undefined) {
      result.set(teamId, override);
      return;
    }

    // Une seule equipe -> milieu de la fourchette.
    const rating =
      n <= 1 ? (seedMax + seedMin) / 2 : seedMax - index * ((seedMax - seedMin) / (n - 1));
    result.set(teamId, rating);
  });

  return result;
}

/**
 * Mise a jour Elo apres un match.
 * newRating = rating + kEff * (score - expected)
 * Pendant les `warmupGames` premiers matchs d'une equipe, K est reduit de
 * moitie pour que le seeding de presaison reste dominant au debut.
 */
export function updateElo(input: {
  rating: number;
  expected: number;
  score: 0 | 1;
  k: number;
  gamesPlayed: number;
  warmupGames: number;
}): number {
  const kEff = input.gamesPlayed < input.warmupGames ? input.k * 0.5 : input.k;
  return input.rating + kEff * (input.score - input.expected);
}
