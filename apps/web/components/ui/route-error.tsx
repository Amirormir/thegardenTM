'use client';

import { useEffect } from 'react';

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}

export function RouteError({ error, reset, title, description }: RouteErrorProps) {
  useEffect(() => {
    console.error('[route-error]', error);
  }, [error]);

  return (
    <section className="border-y border-hairline py-12">
      <p className="label-mono">Une erreur est survenue</p>
      <h2 className="mt-3 display-md text-foreground">
        {title ?? 'Cette section n’a pas pu être chargée.'}
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground-dim">
        {description ??
          'Le service est temporairement indisponible. Réessaie dans un instant.'}
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-foreground-dim">
          ref: {error.digest}
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center border border-hairline px-4 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-surface"
      >
        Réessayer
      </button>
    </section>
  );
}
