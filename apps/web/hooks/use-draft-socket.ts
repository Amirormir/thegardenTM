'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  AckResponse,
  ChampionStats,
  ClientToServerEvents,
  CoinflipDecision,
  DraftSide,
  DraftState,
  LockedAction,
  ServerErrorPayload,
  ServerToClientEvents,
} from '@nexus/draft-engine';

export type DraftRole =
  | 'BLUE_CAPTAIN'
  | 'RED_CAPTAIN'
  | 'SPECTATOR'
  | 'ADMIN'
  /** Local-only: lets a dev admin drive both sides of a draft. */
  | 'DEV_DUAL_CAPTAIN';

export type ConnectionStatus =
  | 'idle'
  | 'fetching-token'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

interface ParticipantEntry {
  userId: string;
  role: DraftRole;
  side: 'BLUE' | 'RED' | null;
  ready: boolean;
}

export interface TentativeSelection {
  side: DraftSide;
  step: number;
  championId: string;
}

export interface ResultVoteState {
  blueResultVote: DraftSide | null;
  redResultVote: DraftSide | null;
  winnerSide: DraftSide | null;
  winnerTeamId: string | null;
  resultLockedAt: number | null;
}

export interface CoinflipState {
  winnerTeamId: string | null;
  blueTeamId: string;
  redTeamId: string;
  decision: CoinflipDecision | null;
  resolvedAt: number | null;
}

export interface CoinflipResult {
  winnerTeamId: string;
  blueTeamId: string;
  redTeamId: string;
}

export interface UseDraftSocketResult {
  status: ConnectionStatus;
  role: DraftRole | null;
  teamId: string | null;
  state: DraftState | null;
  lastAction: LockedAction | null;
  /** Stats for the most recently picked champion (split-scoped). Cleared on each new lock. */
  lastChampionStats: ChampionStats | null;
  /** Live preview of the opponent captain's current selection (before they confirm). */
  remoteTentative: TentativeSelection | null;
  /** Coin flip state, persisted server-side for reload/reconnect safety. */
  coinflipState: CoinflipState | null;
  /** Short-lived event used to trigger the coin flip animation. */
  coinflipResult: CoinflipResult | null;
  /** Post-draft result vote state. Null until the realtime server has emitted it. */
  resultState: ResultVoteState | null;
  timerDeadline: number | null;
  participants: ParticipantEntry[];
  error: ServerErrorPayload | null;
  /** Captain-only: signal ready in the lobby. */
  ready: () => Promise<AckResponse>;
  /** Captain-only: submit a pick/ban for the current step. */
  submitAction: (championId: string) => Promise<AckResponse>;
  /** Captain-only: broadcast the currently-hovering champion before confirmation. */
  setTentative: (championId: string | null) => void;
  /** Coin flip winner chooses the final pre-draft dimension/value. */
  submitCoinflipChoice: (decision: CoinflipDecision) => Promise<AckResponse>;
  /** Captain-only: cast a vote on which side won the played game. */
  voteResult: (winnerSide: DraftSide) => Promise<AckResponse>;
}

type DraftClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

async function fetchToken(
  draftId: string,
): Promise<{ token: string; role: DraftRole; teamId: string | null }> {
  const response = await fetch(`/api/draft/${draftId}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Token request failed (${response.status})`);
  }
  return (await response.json()) as { token: string; role: DraftRole; teamId: string | null };
}

export function useDraftSocket(draftId: string): UseDraftSocketResult {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [role, setRole] = useState<DraftRole | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [state, setState] = useState<DraftState | null>(null);
  const [lastAction, setLastAction] = useState<LockedAction | null>(null);
  const [lastChampionStats, setLastChampionStats] = useState<ChampionStats | null>(null);
  const [remoteTentative, setRemoteTentative] = useState<TentativeSelection | null>(null);
  const [coinflipState, setCoinflipState] = useState<CoinflipState | null>(null);
  const [coinflipResult, setCoinflipResult] = useState<CoinflipResult | null>(null);
  const [resultState, setResultState] = useState<ResultVoteState | null>(null);
  const [timerDeadline, setTimerDeadline] = useState<number | null>(null);
  const [participants, setParticipants] = useState<ParticipantEntry[]>([]);
  const [error, setError] = useState<ServerErrorPayload | null>(null);
  const socketRef = useRef<DraftClientSocket | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_REALTIME_URL;
    setRole(null);
    setTeamId(null);
    setState(null);
    setLastAction(null);
    setLastChampionStats(null);
    setRemoteTentative(null);
    setCoinflipState(null);
    setCoinflipResult(null);
    setResultState(null);
    setTimerDeadline(null);
    setParticipants([]);
    setError(null);
    if (!url) {
      setStatus('error');
      setError({
        draftId,
        code: 'UNAUTHORIZED',
        message: 'NEXT_PUBLIC_REALTIME_URL non configuré.',
      });
      return;
    }

    let cancelled = false;
    setStatus('fetching-token');

    void (async () => {
      let token: string;
      let resolvedRole: DraftRole;
      let resolvedTeamId: string | null;
      try {
        const result = await fetchToken(draftId);
        token = result.token;
        resolvedRole = result.role;
        resolvedTeamId = result.teamId;
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setError({
          draftId,
          code: 'UNAUTHORIZED',
          message: (err as Error).message,
        });
        return;
      }

      if (cancelled) return;
      setRole(resolvedRole);
      setTeamId(resolvedTeamId);
      setStatus('connecting');

      const socket: DraftClientSocket = io(url, {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1500,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (cancelled) return;
        setStatus('connected');
        setError(null);
        socket.emit(
          'draft:join',
          { draftId, token },
          (ack: AckResponse) => {
            if (!ack.ok && ack.error) setError(ack.error);
          },
        );
      });

      socket.on('disconnect', () => {
        if (cancelled) return;
        setStatus('disconnected');
      });

      socket.on('connect_error', (err) => {
        if (cancelled) return;
        setStatus('error');
        setError({ draftId, code: 'UNAUTHORIZED', message: err.message });
      });

      socket.on('draft:state', ({ state: nextState }) => {
        setState(nextState);
        setTimerDeadline(nextState.timerDeadline);
      });

      socket.on('draft:action_locked', ({ action, state: nextState, championStats }) => {
        setLastAction(action);
        setLastChampionStats(championStats ?? null);
        setRemoteTentative(null);
        setState(nextState);
        setTimerDeadline(nextState.timerDeadline);
      });

      socket.on('draft:tentative', ({ side, step, championId }) => {
        if (championId === null) {
          setRemoteTentative(null);
        } else {
          setRemoteTentative({ side, step, championId });
        }
      });

      socket.on('draft:coinflip_result', (payload) => {
        setCoinflipResult({
          winnerTeamId: payload.winnerTeamId,
          blueTeamId: payload.blueTeamId,
          redTeamId: payload.redTeamId,
        });
        setCoinflipState((prev) => ({
          winnerTeamId: payload.winnerTeamId,
          blueTeamId: payload.blueTeamId,
          redTeamId: payload.redTeamId,
          decision: prev?.decision ?? null,
          resolvedAt: prev?.resolvedAt ?? null,
        }));
      });

      socket.on('draft:coinflip_state', (payload) => {
        setCoinflipState({
          winnerTeamId: payload.winnerTeamId,
          blueTeamId: payload.blueTeamId,
          redTeamId: payload.redTeamId,
          decision: payload.decision,
          resolvedAt: payload.resolvedAt,
        });
      });

      socket.on('draft:result_state', (payload) => {
        setResultState({
          blueResultVote: payload.blueResultVote,
          redResultVote: payload.redResultVote,
          winnerSide: payload.winnerSide,
          winnerTeamId: payload.winnerTeamId,
          resultLockedAt: payload.resultLockedAt,
        });
      });

      socket.on('draft:timer', ({ deadline }) => {
        setTimerDeadline(deadline);
      });

      socket.on('draft:participant', (entry) => {
        setParticipants((prev) => {
          const next = prev.filter((p) => p.userId !== entry.userId);
          next.push({
            userId: entry.userId,
            role: entry.role,
            side: entry.side,
            ready: entry.ready,
          });
          return next;
        });
      });

      socket.on('draft:participant_left', ({ userId }) => {
        setParticipants((prev) => prev.filter((p) => p.userId !== userId));
      });

      socket.on('draft:paused', () => {
        setState((prev) => (prev ? { ...prev, status: 'PAUSED', timerDeadline: null } : prev));
        setTimerDeadline(null);
      });

      socket.on('draft:resumed', ({ state: nextState }) => {
        setState(nextState);
        setTimerDeadline(nextState.timerDeadline);
      });

      socket.on('draft:cancelled', () => {
        setState((prev) => (prev ? { ...prev, status: 'CANCELLED', timerDeadline: null } : prev));
        setTimerDeadline(null);
      });

      socket.on('draft:completed', ({ state: nextState }) => {
        setState(nextState);
        setTimerDeadline(null);
      });

      socket.on('draft:error', (payload) => {
        setError(payload);
      });
    })();

    return () => {
      cancelled = true;
      const socket = socketRef.current;
      if (socket) {
        socket.emit('draft:leave', { draftId });
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [draftId]);

  const ready = useCallback((): Promise<AckResponse> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) {
        resolve({ ok: false, error: { draftId, code: 'CONFLICT', message: 'Non connecté.' } });
        return;
      }
      socket.emit('draft:ready', { draftId }, resolve);
    });
  }, [draftId]);

  const setTentative = useCallback(
    (championId: string | null): void => {
      const socket = socketRef.current;
      if (!socket) return;
      socket.emit('draft:tentative', { draftId, championId });
    },
    [draftId],
  );

  const submitAction = useCallback(
    (championId: string): Promise<AckResponse> => {
      return new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket || !state) {
          resolve({
            ok: false,
            error: { draftId, code: 'CONFLICT', message: 'Non connecté.' },
          });
          return;
        }
        socket.emit(
          'draft:action',
          {
            draftId,
            championId,
            expectedStep: state.currentStep,
            expectedVersion: state.version,
          },
          resolve,
        );
      });
    },
    [draftId, state],
  );

  const voteResult = useCallback(
    (winnerSide: DraftSide): Promise<AckResponse> => {
      return new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket) {
          resolve({
            ok: false,
            error: { draftId, code: 'CONFLICT', message: 'Non connecté.' },
          });
          return;
        }
        socket.emit('draft:vote_result', { draftId, winnerSide }, resolve);
      });
    },
    [draftId],
  );

  const submitCoinflipChoice = useCallback(
    (decision: CoinflipDecision): Promise<AckResponse> => {
      return new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket) {
          resolve({
            ok: false,
            error: { draftId, code: 'CONFLICT', message: 'Non connectÃ©.' },
          });
          return;
        }
        socket.emit('draft:coinflip_choice', { draftId, decision }, resolve);
      });
    },
    [draftId],
  );

  return {
    status,
    role,
    teamId,
    state,
    lastAction,
    lastChampionStats,
    remoteTentative,
    coinflipState,
    coinflipResult,
    resultState,
    timerDeadline,
    participants,
    error,
    ready,
    submitAction,
    setTentative,
    submitCoinflipChoice,
    voteResult,
  };
}
