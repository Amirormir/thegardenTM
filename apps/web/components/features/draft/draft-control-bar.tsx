'use client';

import { useState } from 'react';
import { Loader2, Pause, Play, Square, XCircle } from 'lucide-react';
import type { DraftStatus } from '@nexus/draft-engine';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import type { DraftRole } from '@/hooks/use-draft-socket';

interface DraftControlBarProps {
  draftId: string;
  status: DraftStatus;
  role: DraftRole | null;
}

type ActionKey = 'start' | 'pause' | 'resume' | 'cancel';

export function DraftControlBar({ draftId, status, role }: DraftControlBarProps) {
  const [pending, setPending] = useState<ActionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startMut = api.draft.start.useMutation();
  const pauseMut = api.draft.pause.useMutation();
  const resumeMut = api.draft.resume.useMutation();
  const cancelMut = api.draft.cancel.useMutation();

  if (!role || role === 'SPECTATOR') return null;
  // DEV_DUAL_CAPTAIN is the local-only admin override — give it full admin controls.
  const isAdmin = role === 'ADMIN' || role === 'DEV_DUAL_CAPTAIN';
  const isCaptain = role === 'BLUE_CAPTAIN' || role === 'RED_CAPTAIN';

  async function run(key: ActionKey) {
    setError(null);
    setPending(key);
    try {
      const mut =
        key === 'start' ? startMut : key === 'pause' ? pauseMut : key === 'resume' ? resumeMut : cancelMut;
      await mut.mutateAsync({ id: draftId });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  const buttons: {
    key: ActionKey;
    label: string;
    icon: typeof Play;
    show: boolean;
    tone: 'primary' | 'neutral' | 'danger';
  }[] = [
    {
      key: 'start',
      label: 'Démarrer',
      icon: Play,
      show: status === 'COINFLIP' && (isAdmin || isCaptain),
      tone: 'primary',
    },
    {
      key: 'pause',
      label: 'Pause',
      icon: Pause,
      show: status === 'IN_PROGRESS' && isAdmin,
      tone: 'neutral',
    },
    {
      key: 'resume',
      label: 'Reprendre',
      icon: Play,
      show: status === 'PAUSED' && isAdmin,
      tone: 'primary',
    },
    {
      key: 'cancel',
      label: 'Annuler',
      icon: XCircle,
      show: status !== 'COMPLETED' && status !== 'CANCELLED' && isAdmin,
      tone: 'danger',
    },
  ];

  const visible = buttons.filter((b) => b.show);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border border-hairline bg-surface px-4 py-3">
      <span className="label-mono text-foreground-muted">
        {isAdmin ? 'Admin' : 'Capitaine'} ·
      </span>
      {visible.map(({ key, label, icon: Icon, tone }) => (
        <button
          key={key}
          type="button"
          onClick={() => run(key)}
          disabled={pending !== null}
          className={cn(
            'inline-flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors duration-150 disabled:opacity-50',
            tone === 'primary' && 'border-accent bg-accent/10 text-foreground hover:bg-accent/20',
            tone === 'neutral' && 'border-hairline bg-bg text-foreground-dim hover:bg-surface-hover hover:text-foreground',
            tone === 'danger' && 'border-rose-500/40 bg-rose-500/5 text-[color:var(--loss)] hover:bg-rose-500/15',
          )}
        >
          {pending === key ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : key === 'cancel' ? (
            <Square className="h-3.5 w-3.5" />
          ) : (
            <Icon className="h-3.5 w-3.5" />
          )}
          {label}
        </button>
      ))}
      {error ? <span className="label-mono text-[color:var(--loss)]">{error}</span> : null}
    </div>
  );
}
