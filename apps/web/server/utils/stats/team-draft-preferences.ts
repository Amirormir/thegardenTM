import type { PrismaClient } from '@nexus/db';

/**
 * Per-team draft preferences. Four blocks, all sourced from DraftAction
 * (§3 rule — drafts are authoritative for picks/bans, no replay needed):
 *
 *   1. picksFor    — champions this team picked
 *   2. bansFor     — champions this team banned
 *   3. picksAgainst — champions other teams picked into this team
 *   4. bansAgainst  — champions other teams banned to deny this team
 *
 * "Bans against this team" is the one the captain cares about: which champions
 * does the rest of the league refuse to let through.
 */

const ELIGIBLE_DRAFT_STATUSES = ['COMPLETED', 'IN_PROGRESS', 'PAUSED'] as const;

export interface TeamDraftPreferencesScope {
  seasonId: string;
  teamId: string;
}

export interface DraftPreferenceRow {
  championId: string;
  count: number;
  share: number; // share of all picks/bans in this block (0..1)
}

export interface TeamDraftPreferences {
  teamId: string;
  seasonId: string;
  draftCount: number;
  picksFor: DraftPreferenceRow[];
  bansFor: DraftPreferenceRow[];
  picksAgainst: DraftPreferenceRow[];
  bansAgainst: DraftPreferenceRow[];
}

function tally(actions: { championId: string | null; side: 'BLUE' | 'RED' }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of actions) {
    if (!a.championId) continue;
    out.set(a.championId, (out.get(a.championId) ?? 0) + 1);
  }
  return out;
}

function toRows(counts: Map<string, number>): DraftPreferenceRow[] {
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  return [...counts.entries()]
    .map(([championId, count]) => ({
      championId,
      count,
      share: total === 0 ? 0 : count / total,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.championId.localeCompare(b.championId);
    });
}

export async function getTeamDraftPreferences(
  prisma: PrismaClient,
  scope: TeamDraftPreferencesScope,
): Promise<TeamDraftPreferences> {
  const drafts = await prisma.draft.findMany({
    where: {
      seasonId: scope.seasonId,
      status: { in: [...ELIGIBLE_DRAFT_STATUSES] },
      OR: [{ blueTeamId: scope.teamId }, { redTeamId: scope.teamId }],
    },
    select: {
      id: true,
      blueTeamId: true,
      redTeamId: true,
      actions: {
        where: { NOT: { championId: null } },
        select: { championId: true, type: true, side: true },
      },
    },
  });

  // Partition every action by (whose side it's on, type)
  const picksForRaw: { championId: string | null; side: 'BLUE' | 'RED' }[] = [];
  const bansForRaw: typeof picksForRaw = [];
  const picksAgainstRaw: typeof picksForRaw = [];
  const bansAgainstRaw: typeof picksForRaw = [];

  for (const d of drafts) {
    const teamSide: 'BLUE' | 'RED' = d.blueTeamId === scope.teamId ? 'BLUE' : 'RED';
    for (const a of d.actions) {
      const isTeamAction = a.side === teamSide;
      if (a.type === 'PICK') {
        (isTeamAction ? picksForRaw : picksAgainstRaw).push(a);
      } else if (a.type === 'BAN') {
        (isTeamAction ? bansForRaw : bansAgainstRaw).push(a);
      }
    }
  }

  return {
    teamId: scope.teamId,
    seasonId: scope.seasonId,
    draftCount: drafts.length,
    picksFor: toRows(tally(picksForRaw)),
    bansFor: toRows(tally(bansForRaw)),
    picksAgainst: toRows(tally(picksAgainstRaw)),
    bansAgainst: toRows(tally(bansAgainstRaw)),
  };
}
