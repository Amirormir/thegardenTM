import { SeasonTwoDashboard } from '@/components/features/custom/season-two-dashboard';
import type { SeasonTwoData } from '@/lib/custom/season-two';
import { getSeasonTwoData } from '@/lib/custom/season-two';

export const revalidate = 15;

interface CustomSeasonTwoPageProps {
  searchParams: Promise<{
    date?: string | string[];
  }>;
}

const MATCH_DAY_KEY_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const MATCH_DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function getMatchDayKey(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = MATCH_DAY_KEY_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) return null;

  return `${year}-${month}-${day}`;
}

function getMatchDayLabel(value: string | null) {
  if (!value) return 'Date inconnue';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';

  return MATCH_DAY_LABEL_FORMATTER.format(date);
}

function buildAvailableMatchDates(matches: SeasonTwoData['recentMatches']) {
  const dates = new Map<string, { value: string; label: string; count: number }>();

  for (const match of matches) {
    const key = getMatchDayKey(match.resolvedAt);
    if (!key) continue;

    const existing = dates.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    dates.set(key, {
      value: key,
      label: getMatchDayLabel(match.resolvedAt),
      count: 1,
    });
  }

  return [...dates.values()];
}

export default async function CustomSeasonTwoPage({ searchParams }: CustomSeasonTwoPageProps) {
  const params = await searchParams;
  const data = await getSeasonTwoData();
  const availableMatchDates = buildAvailableMatchDates(data.recentMatches);
  const requestedDate = typeof params.date === 'string' ? params.date : null;
  const selectedMatchDate =
    requestedDate && availableMatchDates.some((entry) => entry.value === requestedDate)
      ? requestedDate
      : availableMatchDates[0]?.value ?? null;
  const selectedMatchDateLabel =
    availableMatchDates.find((entry) => entry.value === selectedMatchDate)?.label ?? null;
  const filteredMatches = selectedMatchDate
    ? data.recentMatches.filter((match) => getMatchDayKey(match.resolvedAt) === selectedMatchDate)
    : data.recentMatches;

  return (
    <SeasonTwoDashboard
      data={{ ...data, recentMatches: filteredMatches }}
      availableMatchDates={availableMatchDates}
      selectedMatchDate={selectedMatchDate}
      selectedMatchDateLabel={selectedMatchDateLabel}
    />
  );
}
