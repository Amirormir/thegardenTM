'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Loader2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { GardenLogo } from '@/components/ui/garden-logo';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils/cn';
import { isPublicRegistrationEnabled } from '@/lib/runtime-flags';
import { api } from '@/lib/trpc/react';

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

export default function RegisterPage() {
  const register = api.user.register.useMutation();
  const linkablePlayersQuery = api.player.listLinkable.useQuery(undefined, {
    enabled: isPublicRegistrationEnabled,
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [signingIn, setSigningIn] = useState(false);

  const isPending = register.isPending || signingIn;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    try {
      await register.mutateAsync({
        name,
        email,
        password,
        ...(playerId ? { playerId } : {}),
      });
      setSigningIn(true);

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/',
      });

      if (result?.error) {
        setFeedback({
          type: 'success',
          message: 'Compte créé. Tu peux maintenant te connecter.',
        });
        setSigningIn(false);
        return;
      }

      window.location.assign(resolvePostLoginTarget(result?.url, '/'));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "L'inscription a échoué.";
      setFeedback({ type: 'error', message });
      setSigningIn(false);
    }
  }

  if (!isPublicRegistrationEnabled) {
    return (
      <div className="mx-auto grid max-w-5xl gap-10 py-12 lg:grid-cols-[1fr_0.9fr]">
        <section className="border-b border-hairline pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-12">
          <p className="breadcrumb-mono">§ · Compte · Accès</p>
          <div className="mt-6 flex items-center gap-4">
            <GardenLogo showLabel={false} imageClassName="h-14 w-14" />
            <div>
              <h1 className="display-lg text-foreground">Inscriptions fermées.</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-foreground-dim">
                En production, les nouveaux comptes ne se créent pas publiquement. L’accès est
                validé au cas par cas.
              </p>
            </div>
          </div>
        </section>

        <section className="border border-hairline bg-surface p-6 md:p-8">
          <p className="label-mono">Accès validé</p>
          <h2 className="mt-4 display-md text-foreground">Passe par le canal officiel.</h2>
          <p className="mt-3 text-sm leading-6 text-foreground-dim">
            Si tu as déjà un compte, connecte-toi. Sinon, rejoins le Discord pour demander un
            accès.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link href="/login" className={buttonVariants({ size: 'lg' })}>
              Aller à la connexion
            </Link>
            <Link
              href="https://discord.gg/tbdX73KSzt"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
            >
              Rejoindre le Discord
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-12 py-12">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Compte · Inscription</p>
        <h1 className="mt-4 display-lg text-foreground">Créer un compte.</h1>
        <p className="mt-4 text-base leading-7 text-foreground-dim">
          Rejoins la ligue et commence à suivre le transfermarket.
        </p>
      </header>

      <section className="flex flex-col gap-8">
        {feedback ? (
          <div
            className={cn(
              'border-l-2 border-y border-r border-hairline bg-surface px-5 py-4 label-mono',
              feedback.type === 'success'
                ? 'border-l-[color:var(--win)] text-[color:var(--win)]'
                : 'border-l-[color:var(--loss)] text-[color:var(--loss)]',
            )}
          >
            {feedback.message}
          </div>
        ) : null}

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="label-mono" htmlFor="register-name">
              Nom
            </label>
            <Input
              id="register-name"
              required
              placeholder="Votre nom"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-mono" htmlFor="register-email">
              Email
            </label>
            <Input
              id="register-email"
              required
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-mono" htmlFor="register-password">
              Mot de passe
            </label>
            <Input
              id="register-password"
              required
              type="password"
              autoComplete="new-password"
              placeholder="8 caractères minimum"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-mono" htmlFor="register-password-confirmation">
              Confirmer le mot de passe
            </label>
            <Input
              id="register-password-confirmation"
              required
              type="password"
              autoComplete="new-password"
              placeholder="Répétez le mot de passe"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-mono" htmlFor="register-player">
              Carte joueur (optionnel)
            </label>
            <Select
              id="register-player"
              value={playerId}
              disabled={isPending || linkablePlayersQuery.isLoading}
              onChange={(event) => setPlayerId(event.target.value)}
            >
              <option value="">Aucune carte</option>
              {(linkablePlayersQuery.data ?? []).map((player) => {
                const taken = player.linkedAccountId !== null;
                return (
                  <option key={player.id} value={player.id} disabled={taken}>
                    {player.displayName} · {player.teamShortCode}
                    {taken ? ' (déjà reliée)' : ''}
                  </option>
                );
              })}
            </Select>
            <p className="text-xs leading-6 text-foreground-muted">
              Relie ton compte à ta carte du marché pour recevoir ton salaire par BO. À la
              confiance — un admin peut corriger ensuite.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full"
            icon={
              isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )
            }
          >
            {isPending ? 'Création en cours…' : "S'inscrire"}
          </Button>
        </form>

        <div className="border-t border-hairline pt-6 text-sm text-foreground-dim">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-accent transition hover:text-foreground">
            Se connecter
          </Link>
        </div>

        <div className="border-t border-hairline pt-6 text-sm leading-6 text-foreground-dim">
          <span className="label-mono">Accès privé</span>
          <p className="mt-3">
            Certains accès sensibles, comme le back-office, restent réservés aux comptes validés.
          </p>
        </div>
      </section>
    </div>
  );
}
