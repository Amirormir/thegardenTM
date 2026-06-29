'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { GardenLogo } from '@/components/ui/garden-logo';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

interface LoginFormProps {
  callbackUrl: string;
  error: string | null;
  publicRegistrationEnabled: boolean;
}

function resolveFeedbackMessage(error: string | null) {
  switch (error) {
    case 'CredentialsSignin':
      return "Email ou mot de passe incorrect.";
    case 'AccessDenied':
      return 'Cette méthode de connexion est réservée aux comptes déjà validés.';
    case 'OAuthAccountNotLinked':
      return 'Ce compte existe déjà avec une autre méthode de connexion.';
    default:
      return error ? 'La connexion a échoué. Réessaie dans un instant.' : null;
  }
}

function resolvePostLoginTarget(resultUrl: string | null | undefined, fallbackUrl: string) {
  if (!resultUrl) {
    return fallbackUrl;
  }

  try {
    const resolved = new URL(resultUrl, window.location.origin);
    return `${resolved.pathname}${resolved.search}${resolved.hash}` || fallbackUrl;
  } catch {
    return fallbackUrl;
  }
}

export function LoginForm({
  callbackUrl,
  error,
  publicRegistrationEnabled,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingProvider, setPendingProvider] = useState<'credentials' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error'; message: string } | null>(
    error ? { type: 'error', message: resolveFeedbackMessage(error) ?? 'La connexion a échoué.' } : null,
  );

  const safeCallbackUrl = useMemo(
    () => (callbackUrl.startsWith('/') ? callbackUrl : '/'),
    [callbackUrl],
  );

  async function handleCredentialsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setPendingProvider('credentials');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: safeCallbackUrl,
      });

      if (result?.error) {
        setFeedback({
          type: 'error',
          message: resolveFeedbackMessage(result.error) ?? 'La connexion a échoué.',
        });
        setPendingProvider(null);
        return;
      }

      window.location.assign(resolvePostLoginTarget(result?.url, safeCallbackUrl));
    } catch {
      setFeedback({
        type: 'error',
        message: 'Impossible de finaliser la connexion pour le moment.',
      });
      setPendingProvider(null);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-12 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
      <section className="border-b border-hairline pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-12">
        <p className="breadcrumb-mono">§ · Accès · Garden</p>
        <div className="mt-6 flex items-center gap-4">
          <GardenLogo showLabel={false} imageClassName="h-14 w-14" />
          <div>
            <h1 className="display-lg text-foreground">Connexion</h1>
            <p className="mt-2 max-w-xl text-base leading-7 text-foreground-dim">
              Accède au back-office, aux espaces d’équipe et aux outils privés dans la même
              direction visuelle que le reste du site.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="border-t border-hairline pt-5">
            <p className="label-mono">Accès admin</p>
            <p className="mt-3 text-sm leading-6 text-foreground-dim">
              Les sessions admin redirigent directement vers le back-office une fois validées.
            </p>
          </div>
          <div className="border-t border-hairline pt-5">
            <p className="label-mono">Comptes publics</p>
            <p className="mt-3 text-sm leading-6 text-foreground-dim">
              {publicRegistrationEnabled
                ? 'Les inscriptions sont ouvertes depuis la page dédiée.'
                : 'Les inscriptions publiques sont fermées en production. Les nouveaux accès passent par validation.'}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          {publicRegistrationEnabled ? (
            <Link href="/register" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
              Créer un compte
            </Link>
          ) : (
            <Link
              href="https://discord.gg/tbdX73KSzt"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
            >
              Rejoindre le Discord
            </Link>
          )}
        </div>
      </section>

      <section className="border border-hairline bg-surface p-6 md:p-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <p className="label-mono">Compte existant</p>
        </div>

        <h2 className="mt-4 display-md text-foreground">Se connecter proprement.</h2>
        <p className="mt-3 text-sm leading-6 text-foreground-dim">
          Identifiants email et mot de passe.
        </p>

        {feedback ? (
          <div
            className={cn(
              'mt-6 border-l-2 border-y border-r border-hairline bg-background px-4 py-3 text-sm',
              'border-l-[color:var(--loss)] text-[color:var(--loss)]',
            )}
          >
            {feedback.message}
          </div>
        ) : null}

        <form className="mt-8 flex flex-col gap-5" onSubmit={handleCredentialsSubmit}>
          <div className="flex flex-col gap-2">
            <label className="label-mono" htmlFor="login-email">
              Email
            </label>
            <Input
              id="login-email"
              required
              type="email"
              autoComplete="email"
              placeholder="admin@garden.dev"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-mono" htmlFor="login-password">
              Mot de passe
            </label>
            <Input
              id="login-password"
              required
              type="password"
              autoComplete="current-password"
              placeholder="Votre mot de passe"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={pendingProvider !== null}
            icon={
              pendingProvider === 'credentials' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LockKeyhole className="h-4 w-4" />
              )
            }
          >
            {pendingProvider === 'credentials' ? 'Connexion en cours…' : 'Se connecter'}
          </Button>
        </form>

        <div className="mt-6 text-sm leading-6 text-foreground-dim">
          {publicRegistrationEnabled ? (
            <span>
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-accent transition hover:text-foreground">
                Ouvrir l’inscription
              </Link>
            </span>
          ) : (
            <span>
              Besoin d’un accès ?{' '}
              <Link
                href="https://discord.gg/tbdX73KSzt"
                target="_blank"
                rel="noreferrer"
                className="text-accent transition hover:text-foreground"
              >
                Passe par le Discord
              </Link>
              .
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
