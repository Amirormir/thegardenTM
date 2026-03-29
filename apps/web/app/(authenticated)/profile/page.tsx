'use client';

import { Camera, Loader2, Save, User } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/trpc/react';
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

  // Populate form once data is loaded
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
    // empty string means "remove avatar"
    if (image !== (meQuery.data?.image ?? '')) updates.image = image;

    if (Object.keys(updates).length === 0) {
      setFeedback({ type: 'error', message: 'Aucun changement detecte.' });
      return;
    }

    try {
      await updateProfile.mutateAsync(updates);
      // Refresh the Auth.js session token so the navbar updates
      await updateSession();
      await meQuery.refetch();
      setFeedback({ type: 'success', message: 'Profil mis a jour.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'La mise a jour a echoue.';
      setFeedback({ type: 'error', message });
    }
  }

  const user = meQuery.data;
  const avatarSrc = image || user?.image || null;
  const showAvatarImage = Boolean(avatarSrc) && !avatarLoadFailed;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <p className="text-kicker">Compte</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Mon profil</h1>
      </div>

      {meQuery.isLoading ? (
        <div className="flex items-center justify-center gap-3 py-12 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
        </div>
      ) : (
        <Card className="space-y-6">
          {/* Avatar preview */}
          <div className="flex items-center gap-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {showAvatarImage ? (
                <img
                  src={avatarSrc ?? undefined}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-8 w-8 text-text-muted" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-white">{user?.name ?? 'Inconnu'}</p>
              <p className="text-sm text-text-secondary">{user?.email}</p>
              <span className="mt-1 inline-block rounded-full bg-accent-primary/15 px-2.5 py-0.5 text-xs font-semibold text-accent-glow">
                {user?.role ?? 'USER'}
              </span>
            </div>
          </div>

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

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="name" className="text-xs uppercase tracking-[0.18em] text-text-secondary">
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

            <div className="space-y-2">
              <label htmlFor="image" className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                URL de l'avatar
              </label>
              <Input
                id="image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://exemple.com/avatar.png"
                type="url"
              />
              <p className="text-xs text-text-muted">
                Laissez vide pour supprimer l'avatar. Utilisez une URL d'image directe (PNG, JPG, WebP).
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
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
              {user?.captainedTeam ? (
                <p className="text-xs text-text-muted">
                  Capitaine de{' '}
                  <span className="text-text-secondary">{user.captainedTeam.name}</span>
                </p>
              ) : null}
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
