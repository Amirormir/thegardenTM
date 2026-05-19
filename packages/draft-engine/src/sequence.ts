export type DraftSide = 'BLUE' | 'RED';
export type DraftActionType = 'BAN' | 'PICK';

export interface DraftStep {
  step: number;
  type: DraftActionType;
  side: DraftSide;
  phase: 1 | 2;
}

/**
 * Competitive 20-step pick/ban sequence (LCK/LEC standard).
 *
 *  ban phase 1   : steps 1..6   (alternating B, R)
 *  pick phase 1  : steps 7..12  (B R R B B R)
 *  ban phase 2   : steps 13..16 (R B R B)
 *  pick phase 2  : steps 17..20 (R B B R)
 */
export const DRAFT_SEQUENCE: readonly DraftStep[] = [
  { step: 1, type: 'BAN', side: 'BLUE', phase: 1 },
  { step: 2, type: 'BAN', side: 'RED', phase: 1 },
  { step: 3, type: 'BAN', side: 'BLUE', phase: 1 },
  { step: 4, type: 'BAN', side: 'RED', phase: 1 },
  { step: 5, type: 'BAN', side: 'BLUE', phase: 1 },
  { step: 6, type: 'BAN', side: 'RED', phase: 1 },
  { step: 7, type: 'PICK', side: 'BLUE', phase: 1 },
  { step: 8, type: 'PICK', side: 'RED', phase: 1 },
  { step: 9, type: 'PICK', side: 'RED', phase: 1 },
  { step: 10, type: 'PICK', side: 'BLUE', phase: 1 },
  { step: 11, type: 'PICK', side: 'BLUE', phase: 1 },
  { step: 12, type: 'PICK', side: 'RED', phase: 1 },
  { step: 13, type: 'BAN', side: 'RED', phase: 2 },
  { step: 14, type: 'BAN', side: 'BLUE', phase: 2 },
  { step: 15, type: 'BAN', side: 'RED', phase: 2 },
  { step: 16, type: 'BAN', side: 'BLUE', phase: 2 },
  { step: 17, type: 'PICK', side: 'RED', phase: 2 },
  { step: 18, type: 'PICK', side: 'BLUE', phase: 2 },
  { step: 19, type: 'PICK', side: 'BLUE', phase: 2 },
  { step: 20, type: 'PICK', side: 'RED', phase: 2 },
] as const;

export const TOTAL_STEPS = DRAFT_SEQUENCE.length;
export const PICKS_PER_SIDE = 5;
export const BANS_PER_SIDE = 5;

export function getStep(step: number): DraftStep | null {
  if (step < 1 || step > TOTAL_STEPS) return null;
  return DRAFT_SEQUENCE[step - 1] ?? null;
}

export function isCompleted(step: number): boolean {
  return step >= TOTAL_STEPS;
}
