'use client';

import { Camera, Loader2, Save, User } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/trpc/react';
import { resolveAccountAvatarUrl } from '@/lib/utils/account-avatar';
import { cn } from '@/lib/utils/cn';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export default function ProfilePage() {
  const { update: updateSession } = useSession();
  const meQuery = api.user.me.useQuery();
  const updateProfile = api.user.updateProfile.useMutation();

  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    if (meQuery.data) {
      setName(meQuery.data.name ?? '');
      setImage(meQuery.data.image ?? '');
    }
  }, [meQuery.data]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [image, meQuery.data?.image]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const updates: { name?: string; image?: string } = {};
    if (name.trim() && name.trim() !== meQuery.data?.name) updates.name = name.trim();
    if (image !== (meQuery.data?.image ?? '')) updates.image = image;

    if (Object.keys(updates).length === 0) {
      setFeedback({ type: 'error', message: 'Aucun changement détecté.' });
      return;
    }

    try {
      await updateProfile.mutateAsync(updates);
      await updateSession();
      await meQuery.refetch();
      setFeedback({ type: 'success', message: 'Profil mis à jour.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'La mise à jour a échoué.';
      setFeedback({ type: 'error', message });
    }
  }

  const user = meQuery.data;
  const avatarSrc = image || user?.image || null;
  const resolvedAvatarSrc = resolveAccountAvatarUrl(avatarSrc);
  const showAvatarImage = Boolean(resolvedAvatarSrc) && !avatarLoadFailed;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-16 md:gap-20">
      <header className="border-b border-hairline pb-8">
        <p className="breadcrumb-mono">§ · Compte · Profil</p>
        <h1 className="mt-4 display-lg text-foreground">Mon profil.</h1>
      </header>

      {meQuery.isLoading ? (
        <div className="flex items-center justify-center gap-3 py-12 label-mono text-foreground-dim">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      ) : (
        <section className="flex flex-col gap-10">
          <div className="flex items-center gap-6 border-y border-hairline py-8">
            <div className="placeholder-diag relative h-24 w-24 shrink-0 overflow-hidden">
              {showAvatarImage ? (
                <img
                  src={resolvedAvatarSrc ?? undefined}
                  alt="Avatar"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-9 w-9 text-foreground-muted" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
                <Camera className="h-5 w-5 text-foreground" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-display text-2xl tracking-tight text-foreground">
                {user?.name ?? 'Inconnu'}
              </p>
              <p className="text-sm text-foreground-dim">{user?.email}</p>
              <p className="label-mono text-accent">{user?.role ?? 'USER'}</p>
            </div>
          </div>

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

          <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-3">
              <label htmlFor="name" className="label-mono">
                Pseudo affiché
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom affiché sur le site"
                maxLength={50}
              />
            </div>

            <div className="flex flex-col gap-3">
              <label htmlFor="image" className="label-mono">
                URL de l&apos;avatar
              </label>
              <Input
                id="image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://exemple.com/avatar.png"
                type="url"
              />
              <p className="text-xs leading-6 text-foreground-muted">
                Laissez vide pour supprimer l&apos;avatar. Utilisez une URL d&apos;image directe (PNG, JPG, WebP).
              </p>
            </div>

            <div className="flex items-center gap-4 border-t border-hairline pt-6">
              <Button
                type="submit"
                disabled={updateProfile.isPending}
                icon={
                  updateProfile.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )
                }
              >
                Enregistrer
              </Button>
              {user?.captainOfTeam ? (
                <p className="label-mono text-foreground-muted">
                  Capitaine · <span className="text-foreground-dim">{user.captainOfTeam.name}</span>
                </p>
              ) : null}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
