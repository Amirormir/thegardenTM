'use client';

import type { inferRouterOutputs } from '@trpc/server';
import { Loader2, Newspaper, Plus, Save, Star, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/format';
import type { AppRouter } from '@/server/routers/_app';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type AdminArticle = RouterOutputs['article']['getAdminList'][number];
type AdminArticleDetails = RouterOutputs['article']['getAdminById'];

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

interface DraftState {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  isPublished: boolean;
}

function createEmptyDraft(): DraftState {
  return {
    slug: '',
    title: '',
    excerpt: '',
    body: '',
    coverImageUrl: '',
    isPublished: false,
  };
}

function createDraftFromArticle(article: AdminArticleDetails): DraftState {
  return {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    body: article.body,
    coverImageUrl: article.coverImageUrl ?? '',
    isPublished: article.isPublished,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function FeedbackBanner({ feedback }: { feedback: FeedbackState | null }) {
  if (!feedback) return null;
  return (
    <div
      className={cn(
        'border px-4 py-3 text-sm',
        feedback.type === 'success'
          ? 'border-emerald-400/20 bg-emerald-500/10 text-[color:var(--win)]'
          : 'border-rose-400/20 bg-rose-500/10 text-[color:var(--loss)]',
      )}
    >
      {feedback.message}
    </div>
  );
}

export function AdminNewsManager() {
  const utils = api.useUtils();
  const listQuery = api.article.getAdminList.useQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(createEmptyDraft);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [slugDirty, setSlugDirty] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description?: string;
    confirmLabel: string;
    destructive?: boolean;
    requireText?: string;
    action: () => Promise<void>;
  } | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const detailsQuery = api.article.getAdminById.useQuery(
    { id: selectedId ?? '' },
    { enabled: selectedId !== null },
  );

  const createArticle = api.article.create.useMutation();
  const updateArticle = api.article.update.useMutation();
  const deleteArticle = api.article.delete.useMutation();
  const setFeatured = api.article.setFeatured.useMutation();

  useEffect(() => {
    if (detailsQuery.data) {
      setDraft(createDraftFromArticle(detailsQuery.data));
      setSlugDirty(true);
    }
  }, [detailsQuery.data]);

  useEffect(() => {
    if (selectedId === null) {
      setDraft(createEmptyDraft());
      setSlugDirty(false);
    }
  }, [selectedId]);

  const articles = listQuery.data ?? [];
  const featuredArticle = useMemo(
    () => articles.find((article) => article.isFeatured) ?? null,
    [articles],
  );

  const isEditing = selectedId !== null;
  const submitting = createArticle.isPending || updateArticle.isPending;

  async function refresh(id?: string) {
    await Promise.all([
      utils.article.getAdminList.invalidate(),
      utils.article.getFeatured.invalidate(),
      utils.article.getAll.invalidate(),
      id ? utils.article.getAdminById.invalidate({ id }) : utils.article.getAdminById.invalidate(),
    ]);
  }

  async function runConfirm() {
    if (!confirmState) return;
    setConfirmPending(true);
    try {
      await confirmState.action();
      setConfirmState(null);
    } finally {
      setConfirmPending(false);
    }
  }

  function startNew() {
    setSelectedId(null);
    setDraft(createEmptyDraft());
    setSlugDirty(false);
    setFeedback(null);
  }

  function handleTitleChange(value: string) {
    setDraft((current) => {
      const next: DraftState = { ...current, title: value };
      if (!isEditing && !slugDirty) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  function handleSlugChange(value: string) {
    setSlugDirty(true);
    setDraft((current) => ({ ...current, slug: slugify(value) }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const trimmed = {
      slug: draft.slug.trim(),
      title: draft.title.trim(),
      excerpt: draft.excerpt.trim(),
      body: draft.body.trim(),
      coverImageUrl: draft.coverImageUrl.trim(),
    };

    try {
      if (isEditing && selectedId) {
        await updateArticle.mutateAsync({
          id: selectedId,
          slug: trimmed.slug,
          title: trimmed.title,
          excerpt: trimmed.excerpt,
          body: trimmed.body,
          coverImageUrl: trimmed.coverImageUrl.length > 0 ? trimmed.coverImageUrl : '',
          isPublished: draft.isPublished,
        });
        await refresh(selectedId);
        setFeedback({ type: 'success', message: 'Article mis à jour.' });
        return;
      }

      const created = await createArticle.mutateAsync({
        slug: trimmed.slug,
        title: trimmed.title,
        excerpt: trimmed.excerpt,
        body: trimmed.body,
        ...(trimmed.coverImageUrl.length > 0 ? { coverImageUrl: trimmed.coverImageUrl } : {}),
        isPublished: draft.isPublished,
      });
      setSelectedId(created.id);
      await refresh(created.id);
      setFeedback({ type: 'success', message: 'Article créé.' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Échec de l'enregistrement de l'article.";
      setFeedback({ type: 'error', message });
    }
  }

  function handleDelete() {
    if (!selectedId) return;
    const label = draft.title.trim() || 'SUPPRIMER';
    setConfirmState({
      title: 'Supprimer cet article ?',
      description: 'Cette action est irréversible.',
      confirmLabel: 'Supprimer définitivement',
      destructive: true,
      requireText: label,
      action: async () => {
        try {
          await deleteArticle.mutateAsync({ id: selectedId });
          setSelectedId(null);
          await refresh();
          setFeedback({ type: 'success', message: 'Article supprimé.' });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Échec de la suppression de l'article.";
          setFeedback({ type: 'error', message });
        }
      },
    });
  }

  async function handleSetFeatured(article: AdminArticle) {
    setFeedback(null);
    try {
      if (article.isFeatured) {
        await setFeatured.mutateAsync({ id: null });
        setFeedback({ type: 'success', message: 'Article retiré de la une.' });
      } else {
        await setFeatured.mutateAsync({ id: article.id });
        setFeedback({ type: 'success', message: `« ${article.title} » est désormais à la une.` });
      }
      await refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Échec du changement d'article mis en avant.";
      setFeedback({ type: 'error', message });
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
      <aside className="border-r-0 lg:border-r lg:border-hairline lg:pr-8">
        <div className="flex items-center justify-between gap-3 border-b border-hairline pb-4">
          <div>
            <p className="label-mono">Articles</p>
            <p className="mt-1 text-sm text-foreground-dim">{articles.length} entrées</p>
          </div>
          <Button type="button" size="sm" onClick={startNew} icon={<Plus className="h-3.5 w-3.5" />}>
            Nouveau
          </Button>
        </div>

        {featuredArticle ? (
          <div className="mt-5 border border-hairline bg-surface p-4">
            <p className="label-mono flex items-center gap-2 text-foreground">
              <Star className="h-3.5 w-3.5" /> À la une
            </p>
            <p className="mt-2 text-sm text-foreground">{featuredArticle.title}</p>
            <p className="mt-1 label-mono text-foreground-muted">/{featuredArticle.slug}</p>
          </div>
        ) : (
          <div className="mt-5 border border-hairline bg-surface p-4">
            <p className="label-mono">Aucune une</p>
            <p className="mt-2 text-sm text-foreground-dim">
              Choisissez un article publié pour remplacer le hero de l&apos;accueil.
            </p>
          </div>
        )}

        <ul className="mt-6 flex flex-col">
          {articles.length === 0 ? (
            <li className="border-t border-hairline py-6 text-sm text-foreground-muted">
              Aucun article pour le moment.
            </li>
          ) : (
            articles.map((article) => {
              const active = article.id === selectedId;
              return (
                <li key={article.id} className="border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(article.id);
                      setFeedback(null);
                    }}
                    className={cn(
                      'group flex w-full flex-col gap-1 px-3 py-4 text-left transition-colors duration-150',
                      active ? 'bg-surface' : 'hover:bg-surface-hover',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground line-clamp-1">
                        {article.title}
                      </span>
                      {article.isFeatured ? (
                        <Star className="h-3.5 w-3.5 shrink-0 text-accent" />
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2 label-mono text-foreground-muted">
                      <span>/{article.slug}</span>
                      <span>·</span>
                      <span className={article.isPublished ? 'text-[color:var(--win)]' : ''}>
                        {article.isPublished ? 'Publié' : 'Brouillon'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <section className="flex flex-col gap-6">
        <FeedbackBanner feedback={feedback} />

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <label className="label-mono">Titre</label>
            <Input
              required
              value={draft.title}
              maxLength={180}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="Le mercato d'hiver bat son plein"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="label-mono">Slug (URL)</label>
            <Input
              required
              value={draft.slug}
              maxLength={120}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="le-mercato-d-hiver-bat-son-plein"
            />
            <p className="label-mono text-foreground-muted">
              /news/{draft.slug || 'votre-slug'}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="label-mono">Image de couverture (URL)</label>
            <Input
              type="url"
              value={draft.coverImageUrl}
              onChange={(event) =>
                setDraft((current) => ({ ...current, coverImageUrl: event.target.value }))
              }
              placeholder="https://res.cloudinary.com/.../cover.jpg"
            />
            {draft.coverImageUrl ? (
              <div className="relative h-48 w-full overflow-hidden border border-hairline bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.coverImageUrl}
                  alt="Aperçu"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <label className="label-mono">Chapeau / Extrait</label>
            <textarea
              required
              value={draft.excerpt}
              minLength={10}
              maxLength={320}
              onChange={(event) =>
                setDraft((current) => ({ ...current, excerpt: event.target.value }))
              }
              rows={3}
              className="w-full border border-hairline bg-surface p-3 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-colors duration-150 focus:border-accent"
              placeholder="Une phrase d'accroche qui résume l'article."
            />
            <p className="label-mono text-foreground-muted">
              {draft.excerpt.length}/320 caractères
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <label className="label-mono">Corps de l&apos;article</label>
            <textarea
              required
              value={draft.body}
              minLength={20}
              maxLength={20000}
              onChange={(event) =>
                setDraft((current) => ({ ...current, body: event.target.value }))
              }
              rows={16}
              className="w-full border border-hairline bg-surface p-3 text-sm leading-7 text-foreground placeholder:text-foreground-muted outline-none transition-colors duration-150 focus:border-accent"
              placeholder="Séparez vos paragraphes par une ligne vide."
            />
            <p className="label-mono text-foreground-muted">
              {draft.body.length}/20000 caractères · les paragraphes sont séparés par une ligne vide
            </p>
          </div>

          <label className="flex items-center gap-3 border border-hairline bg-surface px-4 py-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={draft.isPublished}
              onChange={(event) =>
                setDraft((current) => ({ ...current, isPublished: event.target.checked }))
              }
              className="h-4 w-4 accent-[color:var(--accent)]"
            />
            <span>Publier (rendre l&apos;article visible publiquement)</span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={submitting} icon={submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}>
                {isEditing ? 'Enregistrer' : 'Créer'}
              </Button>
              {isEditing && detailsQuery.data ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    handleSetFeatured({
                      id: detailsQuery.data.id,
                      slug: detailsQuery.data.slug,
                      title: detailsQuery.data.title,
                      excerpt: detailsQuery.data.excerpt,
                      coverImageUrl: detailsQuery.data.coverImageUrl,
                      isPublished: detailsQuery.data.isPublished,
                      isFeatured: detailsQuery.data.isFeatured,
                      publishedAt: detailsQuery.data.publishedAt,
                      createdAt: detailsQuery.data.createdAt,
                      updatedAt: detailsQuery.data.updatedAt,
                      author: detailsQuery.data.author,
                    })
                  }
                  disabled={setFeatured.isPending || !detailsQuery.data.isPublished}
                  icon={<Star className="h-3.5 w-3.5" />}
                >
                  {detailsQuery.data.isFeatured ? 'Retirer de la une' : 'Mettre à la une'}
                </Button>
              ) : null}
            </div>
            {isEditing ? (
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                icon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Supprimer
              </Button>
            ) : null}
          </div>
        </form>

        {isEditing && detailsQuery.data ? (
          <div className="border-t border-hairline pt-6">
            <p className="label-mono">Métadonnées</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="label-mono">Auteur</dt>
                <dd className="mt-1 text-foreground">
                  {detailsQuery.data.author.name ?? detailsQuery.data.author.email}
                </dd>
              </div>
              <div>
                <dt className="label-mono">Créé le</dt>
                <dd className="mt-1 tabular-nums text-foreground-dim">
                  {formatDateTime(detailsQuery.data.createdAt)}
                </dd>
              </div>
              {detailsQuery.data.publishedAt ? (
                <div>
                  <dt className="label-mono">Publié le</dt>
                  <dd className="mt-1 tabular-nums text-foreground-dim">
                    {formatDateTime(detailsQuery.data.publishedAt)}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="label-mono">Dernière modification</dt>
                <dd className="mt-1 tabular-nums text-foreground-dim">
                  {formatDateTime(detailsQuery.data.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="border-t border-hairline pt-6 text-sm text-foreground-muted">
            <Newspaper className="mb-3 h-5 w-5" />
            Sélectionnez un article à gauche pour le modifier, ou créez-en un nouveau.
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmState !== null}
        title={confirmState?.title ?? ''}
        {...(confirmState?.description ? { description: confirmState.description } : {})}
        confirmLabel={confirmState?.confirmLabel ?? 'Confirmer'}
        destructive={confirmState?.destructive ?? false}
        pending={confirmPending}
        {...(confirmState?.requireText ? { requireText: confirmState.requireText } : {})}
        onConfirm={runConfirm}
        onCancel={() => {
          if (!confirmPending) setConfirmState(null);
        }}
      />
    </div>
  );
}
