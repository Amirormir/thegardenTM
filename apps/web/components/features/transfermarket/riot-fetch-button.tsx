'use client';

import { Loader2, Radio } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';

interface RiotFetchButtonProps {
  playerId: string;
}

export function RiotFetchButton({ playerId }: RiotFetchButtonProps) {
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fetchFromRiot = api.stats.fetchFromRiot.useMutation();

  async function handleFetch() {
    setFeedback(null);
    try {
      await fetchFromRiot.mutateAsync({ playerId, count: 5 });
      setFeedback({ type: 'success', message: 'Donnees Riot importees.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Le fetch Riot a echoue.';
      setFeedback({ type: 'error', message });
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={fetchFromRiot.isPending}
        icon={fetchFromRiot.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
        onClick={handleFetch}
      >
        Fetch Riot API
      </Button>
      {feedback ? (
        <span
          className={cn(
            'label-mono tabular-nums',
            feedback.type === 'success'
              ? 'text-[color:var(--win)]'
              : 'text-[color:var(--loss)]',
          )}
        >
          {feedback.message}
        </span>
      ) : null}
    </div>
  );
}
