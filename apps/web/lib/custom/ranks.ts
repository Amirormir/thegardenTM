export const CUSTOM_PLACEMENT_GAMES = 10;

export const CUSTOM_RANKS = [
  {
    key: 'Seed',
    label: 'Seed',
    min: 0,
    max: 14,
    accent: 'Base du ladder',
  },
  {
    key: 'Sprout',
    label: 'Sprout',
    min: 15,
    max: 29,
    accent: 'Premiere pousse',
  },
  {
    key: 'Bloom',
    label: 'Bloom',
    min: 30,
    max: 44,
    accent: 'Cap confirme',
  },
  {
    key: 'Thorn',
    label: 'Thorn',
    min: 45,
    max: 59,
    accent: 'Zone tranchante',
  },
  {
    key: 'Crown',
    label: 'Crown',
    min: 60,
    max: 74,
    accent: 'Palier elite',
  },
  {
    key: 'Eden',
    label: 'Eden',
    min: 75,
    max: 89,
    accent: 'Tres haut elo',
  },
  {
    key: 'Heaven',
    label: 'Heaven',
    min: 90,
    max: 100,
    accent: 'Sommet du ladder',
  },
] as const;

export type CustomRankKey = (typeof CUSTOM_RANKS)[number]['key'];
