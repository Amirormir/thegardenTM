'use client';

import { RouteError } from '@/components/ui/route-error';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Back-office indisponible."
      description="Une erreur est survenue sur cette page admin. Vérifie les logs serveur, puis réessaie."
    />
  );
}
