'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState | null }) {
  if (!feedback) return null;

  return (
    <div
      className={cn(
        'border px-4 py-3 text-xs',
        feedback.type === 'success'
          ? 'border-[color:var(--win)] text-[color:var(--win)]'
          : 'border-[color:var(--loss)] text-[color:var(--loss)]',
      )}
    >
      {feedback.message}
    </div>
  );
}

export function DeleteTestLeaderboardButton() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const deleteTests = api.custom.deleteTestLeaderboardEntries.useMutation({
    onSuccess: (result) => {
      setFeedback({
        type: 'success',
        message:
          result.deletedCount > 0
            ? `${result.deletedCount} profil(s) de test ont ete supprimes du classement.`
            : 'Aucun profil de test a supprimer dans le classement.',
      });
      startRefresh(() => {
        router.refresh();
      });
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'La suppression des tests a echoue.',
      });
    },
  });

  if (status === 'loading' || session?.user?.role !== 'ADMIN') {
    return null;
  }

  const isBusy = deleteTests.isPending || isRefreshing;

  async function handleClick() {
    const confirmed = window.confirm(
      'Supprimer tous les profils de test du classement custom ?',
    );

    if (!confirmed) return;

    setFeedback(null);
    await deleteTests.mutateAsync();
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={isBusy}
        icon={isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        onClick={() => {
          void handleClick();
        }}
      >
        Virer les tests du classement
      </Button>
      <FeedbackBanner feedback={feedback} />
    </div>
  );
}
