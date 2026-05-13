'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
          message: 'Compte créé. Vous pouvez maintenant vous connecter.',
        });
        setSigningIn(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "L'inscription a échoué.";
      setFeedback({ type: 'error', message });
      setSigningIn(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-12 py-12">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Compte · Inscription</p>
        <h1 className="mt-4 display-lg text-foreground">Créer un compte.</h1>
        <p className="mt-4 text-base leading-7 text-foreground-dim">
          Rejoignez la ligue et commencez à suivre le transfermarket.
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
            <label className="label-mono">Nom</label>
            <Input
              required
              placeholder="Votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-mono">Email</label>
            <Input
              required
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-mono">Mot de passe</label>
            <Input
              required
              type="password"
              placeholder="8 caractères minimum"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label-mono">Confirmer le mot de passe</label>
            <Input
              required
              type="password"
              placeholder="Répétez le mot de passe"
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
            {isPending ? 'Création en cours…' : "S'inscrire"}
          </Button>
        </form>

        <div className="border-t border-hairline pt-6 label-mono text-foreground-dim">
          Déjà un compte ?{' '}
          <Link href="/api/auth/signin" className="text-accent transition hover:text-foreground">
            Se connecter
          </Link>
        </div>
      </section>
    </div>
  );
}
