# Stats — Source of Truth

This document defines, per metric family, which model is authoritative for the
`/league/stats` aggregations. Every helper, tRPC procedure, and UI component
that surfaces league statistics MUST follow this table. If a number on screen
disagrees with the table below, the call site is wrong — not the table.

The split is driven by what each system actually observes:

- **`Draft` + `DraftAction`** is the only place where bans exist, and where
  pick/ban counts are recorded for *every* completed game (no replay needed).
  It also stores the agreed-upon `winnerSide` once both captains lock the
  result, which gives us a draft-only win rate that doesn't depend on a parsed
  replay being uploaded.
- **`PlayerMatchStats`** only exists for games whose replay was parsed (Riot
  match fetched, or manual upload). It carries per-player performance —
  KDA, CS, gold, damage, vision — that the draft cannot know.

Mixing the two sources for the same metric produces inconsistencies (e.g.
champion appears 12× in drafts but only 4× in PlayerMatchStats because 8
replays weren't parsed). The rule below avoids that.

## §3 — Authoritative source per metric family

| Metric family | Source | Notes |
| --- | --- | --- |
| Pick count, pick rate | `DraftAction` (`type = PICK`) | Scope by `draft.seasonId`, `draft.status ∈ {COMPLETED, IN_PROGRESS, PAUSED}`. |
| Ban count, ban rate | `DraftAction` (`type = BAN`) | Same scope. |
| Presence rate | `DraftAction` | `(picks + bans) / totalDrafts` in scope. |
| Win rate (champion) | `DraftAction` joined with `Draft.winnerSide` | Pick on `side` where `winnerSide = side` ⇒ win; opposite ⇒ loss. Drafts without a locked `winnerSide` are excluded. |
| Win rate (team) | `Draft.winnerTeamId` | Only count drafts where `winnerTeamId` is locked. Side-split win rate joins `Draft.blueTeamId`/`redTeamId` with `winnerSide`. |
| Side preference (team) | `Draft` (`blueTeamId`/`redTeamId` + `winnerSide`) | Captures intent (who picked blue) even without a replay. |
| Bans against a team | `DraftAction` (`type = BAN`, `side` opposite to that team's side) | Computed per draft by looking up the team on the other side. |
| KDA, CS/min, gold/min, damage/min, vision | `PlayerMatchStats` | Performance. Requires replay parse. |
| Damage share, gold share, kill participation | `PlayerMatchStats` | Already pre-computed per row. |
| Champion most played (by player) | `PlayerMatchStats` | Replay-based — only champions actually played on parsed games. |
| Items, runes, build details | `PlayerMatchStats` (+ Riot timeline) | Out of scope for v1 leaderboards. |

## Implication: champion leaderboard rows have two parts

A champion row on `/league/stats` exposes both:

- **Draft-side block** (always available): picks, bans, presence%, wins, losses,
  draft win rate.
- **Performance block** (only for rows with at least one parsed game): avg KDA,
  avg damage, avg CS/min, etc.

The UI distinguishes "—" (no parsed games yet) from "0" (parsed, value really is
zero). Sorting on a performance column hides rows without parsed games rather
than ranking them as 0.

## Implication: team leaderboard rows

Wins / losses / win rate are computed from `Draft.winnerTeamId`, not from
`Match.winnerTeamId` — a series can be ongoing while individual games already
have a recorded winner. Side-split (blue vs. red) wins are joined off
`winnerSide`. Replay-derived team aggregates (avg gold/min, avg game length)
sit in the performance block and may be missing.

## Implication: caching

Both blocks key off `(seasonId, role?, format?, teamId?, championId?)`. The
draft block invalidates on draft action lock, draft result lock, and draft
cancel. The performance block invalidates on `PlayerMatchStats` create / update
for any row in scope. Keep the two cache layers separate so a slow replay
parser doesn't stall the always-available draft block.

## Out-of-scope (don't add until requested)

- Patch-level filtering beyond what `Draft.patchVersion` already exposes.
- Position-specific champion stats (we don't store the lane a pick was made
  for in `DraftAction`).
- Cross-season aggregates — every leaderboard is season-scoped.
