'use client';

import { IdCard, Loader2, Save, Shield, ShieldAlert, User, UserCog, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const ROLE_DISPLAY: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  ADMIN: { label: 'Admin', color: 'text-accent', icon: ShieldAlert },
  TEAM_CAPTAIN: { label: 'Chef d\'equipe', color: 'text-accent', icon: Shield },
  USER: { label: 'Utilisateur', color: 'text-foreground-dim', icon: User },
};

const ROLE_BADGE_CLASSNAMES: Record<string, string> = {
  ADMIN: 'bg-amber-400/14 text-accent ring-1 ring-amber-300/26',
  TEAM_CAPTAIN: 'bg-emerald-500/14 text-[color:var(--win)] ring-1 ring-emerald-400/22',
  USER: 'bg-white/8 text-slate-200 ring-1 ring-white/[0.06]',
};

function FeedbackBanner({ feedback }: { feedback: FeedbackState | null }) {
  if (!feedback) return null;

  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 text-sm',
        feedback.type === 'success'
          ? 'border-emerald-400/20 bg-emerald-500/10 text-[color:var(--win)]'
          : 'border-rose-400/20 bg-rose-500/10 text-[color:var(--loss)]',
      )}
    >
      {feedback.message}
    </div>
  );
}

export function AdminUsersManager() {
  const utils = api.useUtils();
  const usersQuery = api.user.getAll.useQuery();
  const teamsQuery = api.team.getAll.useQuery();
  const linkablePlayersQuery = api.player.listLinkable.useQuery();
  const adminUpdate = api.user.adminUpdate.useMutation();
  const updateRole = api.user.updateRole.useMutation();
  const assignTeam = api.user.assignTeam.useMutation();
  const removeTeam = api.user.removeTeam.useMutation();
  const linkPlayer = api.user.linkPlayer.useMutation();

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editedName, setEditedName] = useState('');
  const [editedImage, setEditedImage] = useState('');

  const users = usersQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const linkablePlayers = linkablePlayersQuery.data ?? [];
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const filteredUsers =
    roleFilter === 'all' ? users : users.filter((user) => user.role === roleFilter);
  const isPending =
    adminUpdate.isPending ||
    updateRole.isPending ||
    assignTeam.isPending ||
    removeTeam.isPending ||
    linkPlayer.isPending;

  useEffect(() => {
    setEditedName(selectedUser?.name ?? '');
    setEditedImage(selectedUser?.image ?? '');
  }, [selectedUser?.id, selectedUser?.name, selectedUser?.image]);

  async function invalidateAll() {
    await Promise.all([
      utils.user.getAll.invalidate(),
      utils.team.getAll.invalidate(),
      utils.team.getById.invalidate(),
      utils.player.listLinkable.invalidate(),
    ]);
  }

  async function handleLinkPlayer(userId: string, playerId: string | null) {
    setFeedback(null);

    try {
      await linkPlayer.mutateAsync({ userId, playerId });
      await invalidateAll();
      setFeedback({
        type: 'success',
        message: playerId ? 'Carte joueur reliee.' : 'Carte joueur deliee.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Echec de la liaison.',
      });
    }
  }

  async function handleUpdateRole(userId: string, role: string) {
    setFeedback(null);

    try {
      await updateRole.mutateAsync({ userId, role: role as 'USER' | 'TEAM_CAPTAIN' | 'ADMIN' });
      await invalidateAll();
      setFeedback({ type: 'success', message: 'Role mis a jour.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Echec de la mise a jour.',
      });
    }
  }

  async function handleUpdateIdentity(userId: string) {
    setFeedback(null);

    try {
      await adminUpdate.mutateAsync({
        userId,
        name: editedName.trim(),
        image: editedImage.trim(),
      });
      await invalidateAll();
      setFeedback({ type: 'success', message: 'Identite du compte mise a jour.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Echec de la mise a jour du compte.',
      });
    }
  }

  async function handleAssignTeam(userId: string, teamId: string) {
    setFeedback(null);

    try {
      await assignTeam.mutateAsync({ userId, teamId });
      await invalidateAll();
      setFeedback({ type: 'success', message: 'Equipe assignee.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Echec de l\'assignation.',
      });
    }
  }

  async function handleRemoveTeam(userId: string) {
    setFeedback(null);

    try {
      await removeTeam.mutateAsync({ userId });
      await invalidateAll();
      setFeedback({ type: 'success', message: 'Equipe retiree.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Echec du retrait.',
      });
    }
  }

  return (
    <div className="space-y-6">
      <FeedbackBanner feedback={feedback} />

      <div className="flex flex-wrap gap-2">
        {['all', 'ADMIN', 'TEAM_CAPTAIN', 'USER'].map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setRoleFilter(role)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              roleFilter === role
                ? 'bg-white text-[#12111a]'
                : 'border border-white/[0.05] bg-white/[0.035] text-white/60 hover:text-white',
            )}
          >
            {role === 'all'
              ? `Tous (${users.length})`
              : `${ROLE_DISPLAY[role]?.label ?? role} (${users.filter((user) => user.role === role).length})`}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <Card className="space-y-4 p-0">
          <div className="border-b border-white/[0.05] px-6 py-5">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white">Utilisateurs</h2>
          </div>

          {usersQuery.isLoading ? (
            <div className="flex items-center gap-3 px-6 py-8 text-sm text-foreground-dim">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredUsers.map((user) => {
                const roleInfo = (ROLE_DISPLAY[user.role] ?? ROLE_DISPLAY.USER)!;
                const RoleIcon = roleInfo.icon;
                const active = user.id === selectedUserId;

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition',
                      active ? 'bg-accent/8' : 'hover:bg-white/3',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.05] bg-white/[0.035]',
                          roleInfo.color,
                        )}
                      >
                        <RoleIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{user.name ?? 'Sans nom'}</p>
                        <p className="text-xs text-foreground-dim">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {user.captainOfTeam ? (
                        <Badge variant="actif">{user.captainOfTeam.shortCode}</Badge>
                      ) : null}
                      <Badge variant="B" className={ROLE_BADGE_CLASSNAMES[user.role] ?? ''}>
                        {roleInfo.label}
                      </Badge>
                    </div>
                  </button>
                );
              })}

              {filteredUsers.length === 0 ? (
                <p className="px-6 py-8 text-sm text-foreground-dim">
                  Aucun utilisateur pour ce filtre.
                </p>
              ) : null}
            </div>
          )}
        </Card>

        {selectedUser ? (
          <Card className="space-y-6 xl:sticky xl:top-8 xl:h-fit">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.05] bg-white/[0.035]">
                <UserCog className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold tracking-tight text-white">
                  {selectedUser.name ?? 'Sans nom'}
                </h3>
                <p className="text-sm text-foreground-dim">{selectedUser.email}</p>
                <p className="mt-1 text-xs text-foreground-muted">
                  Inscrit le {formatDateTime(selectedUser.createdAt)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                Identite
              </label>
              <div className="space-y-3 rounded-2xl border border-white/[0.05] bg-white/[0.035] p-4">
                <Input
                  value={editedName}
                  onChange={(event) => setEditedName(event.target.value)}
                  placeholder="Nom du compte"
                  maxLength={50}
                  disabled={isPending}
                />
                <Input
                  value={editedImage}
                  onChange={(event) => setEditedImage(event.target.value)}
                  placeholder="https://exemple.com/avatar.png"
                  type="url"
                  disabled={isPending}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  icon={
                    isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )
                  }
                  onClick={() => void handleUpdateIdentity(selectedUser.id)}
                >
                  Enregistrer identite
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                Role
              </label>
              <Select
                value={selectedUser.role}
                disabled={isPending}
                onChange={(event) => handleUpdateRole(selectedUser.id, event.target.value)}
              >
                <option value="USER">Utilisateur</option>
                <option value="TEAM_CAPTAIN">Chef d&apos;equipe</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.06em] text-foreground-dim">
                Equipe assignee
              </label>

              {selectedUser.captainOfTeam ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">{selectedUser.captainOfTeam.name}</p>
                    <p className="text-xs text-foreground-dim">
                      {selectedUser.captainOfTeam.shortCode}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={isPending}
                    icon={
                      isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )
                    }
                    onClick={() => handleRemoveTeam(selectedUser.id)}
                  >
                    Retirer
                  </Button>
                </div>
              ) : (
                <Select
                  value=""
                  disabled={isPending}
                  onChange={(event) => {
                    if (event.target.value) {
                      void handleAssignTeam(selectedUser.id, event.target.value);
                    }
                  }}
                >
                  <option value="">Aucune equipe</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.shortCode})
                    </option>
                  ))}
                </Select>
              )}

              <p className="text-xs text-foreground-dim">
                Assigner une equipe promouvra automatiquement un utilisateur au role chef
                d&apos;equipe. Plusieurs capitaines par equipe sont possibles.
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.06em] text-foreground-dim">
                <IdCard className="h-3.5 w-3.5" />
                Carte joueur liee
              </label>

              {selectedUser.linkedPlayer ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">
                      {selectedUser.linkedPlayer.gameName}#{selectedUser.linkedPlayer.tagLine}
                    </p>
                    <p className="text-xs text-foreground-dim">
                      {selectedUser.linkedPlayer.team?.shortCode ?? 'Free Agent'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={isPending}
                    icon={
                      isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )
                    }
                    onClick={() => handleLinkPlayer(selectedUser.id, null)}
                  >
                    Delier
                  </Button>
                </div>
              ) : (
                <Select
                  value=""
                  disabled={isPending || linkablePlayersQuery.isLoading}
                  onChange={(event) => {
                    if (event.target.value) {
                      void handleLinkPlayer(selectedUser.id, event.target.value);
                    }
                  }}
                >
                  <option value="">Aucune carte</option>
                  {linkablePlayers.map((player) => {
                    const taken = player.linkedAccountId !== null;
                    return (
                      <option key={player.id} value={player.id} disabled={taken}>
                        {player.displayName} ({player.teamShortCode})
                        {taken ? ' — deja reliee' : ''}
                      </option>
                    );
                  })}
                </Select>
              )}

              <p className="text-xs text-foreground-dim">
                Le joueur peut choisir sa carte a l&apos;inscription. Seul un admin peut la
                corriger ensuite.
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.06em] text-foreground-dim">
                <Wallet className="h-3.5 w-3.5" />
                Wallet
              </label>
              <div className="rounded-2xl border border-white/[0.05] bg-white/[0.035] px-4 py-3">
                <p className="font-display text-2xl tabular-nums text-white">
                  {formatCurrency(selectedUser.walletBalance)}
                </p>
                <p className="text-xs text-foreground-dim">Solde credite par BO joue.</p>
              </div>
            </div>

            {selectedUser.role === 'TEAM_CAPTAIN' && !selectedUser.captainOfTeam ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-accent">
                Ce chef d&apos;equipe n&apos;a pas d&apos;equipe assignee. Il ne pourra pas acceder
                au dashboard equipe.
              </div>
            ) : null}
          </Card>
        ) : (
          <Card className="flex items-center justify-center py-16 text-center xl:sticky xl:top-8 xl:h-fit">
            <div>
              <UserCog className="mx-auto h-8 w-8 text-foreground-muted" />
              <p className="mt-3 text-sm text-foreground-dim">
                Selectionnez un utilisateur pour gerer son role et son equipe.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
