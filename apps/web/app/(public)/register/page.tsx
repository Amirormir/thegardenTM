'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import { api } from '@/lib/trpc/react';

export default function RegisterPage() {
  const router = useRouter();
  const register = api.user.register.useMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      await register.mutateAsync({ name, email, password });
      setSigningIn(true);

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push('/');
        router.refresh();
      } else {
        setFeedback({
          type: 'success',
          message: 'Compte cree. Vous pouvez maintenant vous connecter.',
        });
        setSigningIn(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'inscription a echoue.";
      setFeedback({ type: 'error', message });
      setSigningIn(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-primary/20 bg-accent-primary/12">
          <UserPlus className="h-7 w-7 text-accent-glow" />
        </div>
        <h1 className="font-display text-2xl tracking-tight font-bold text-white">Creer un compte</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Rejoignez la ligue et commencez a suivre le transfermarket.
        </p>
      </div>

      <Card className="space-y-6">
        {feedback ? (
          <div
            className={cn(
              'rounded-2xl border px-4 py-3 text-sm',
              feedback.type === 'success'
                ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                : 'border-rose-400/20 bg-rose-500/10 text-rose-100',
            )}
          >
            {feedback.message}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">Nom</label>
            <Input
              required
              placeholder="Votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">Email</label>
            <Input
              required
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
              Mot de passe
            </label>
            <Input
              required
              type="password"
              placeholder="8 caracteres minimum"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.06em] text-text-secondary">
              Confirmer le mot de passe
            </label>
            <Input
              required
              type="password"
              placeholder="Repetez le mot de passe"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
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
            {isPending ? 'Creation en cours...' : "S'inscrire"}
          </Button>
        </form>

        <div className="text-center text-sm text-text-secondary">
          Deja un compte ?{' '}
          <Link
            href="/api/auth/signin"
            className="font-semibold text-accent-glow transition hover:text-white"
          >
            Se connecter
          </Link>
        </div>
      </Card>
    </div>
  );
}
