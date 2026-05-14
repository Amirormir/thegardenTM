'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="fr" className="dark">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="label-mono">Erreur critique</p>
          <h1 className="display-lg max-w-xl text-foreground">
            L’application n’a pas pu charger cette page.
          </h1>
          <p className="max-w-xl text-sm text-foreground-dim">
            Une erreur inattendue est survenue. Tente un rafraîchissement, puis
            contacte l’équipe technique si le problème persiste.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-foreground-dim">
              ref: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="border border-hairline px-4 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-surface"
          >
            Rafraîchir
          </button>
        </main>
      </body>
    </html>
  );
}
