'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/trpc/react';
import { cn } from '@/lib/utils/cn';

interface PaletteItem {
  id: string;
  label: string;
  description: string;
  href: string;
  section: string;
  keywords: string[];
}

function includesQuery(item: PaletteItem, query: string) {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  return [item.label, item.description, ...item.keywords].join(' ').toLowerCase().includes(needle);
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const playersQuery = api.player.getAll.useQuery(
    {},
    {
      staleTime: 60_000,
    },
  );
  const teamsQuery = api.team.getAll.useQuery(undefined, {
    staleTime: 60_000,
  });

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }

      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    function handleOpenEvent() {
      setOpen(true);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('nexus:command-palette:open', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('nexus:command-palette:open', handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const staticItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [
      {
        id: 'home',
        label: 'Accueil',
        description: 'Retour à la page d’accueil',
        href: '/',
        section: 'Navigation',
        keywords: ['landing', 'dashboard', 'home'],
      },
      {
        id: 'transfermarket',
        label: 'Transfermarket',
        description: 'Parcourir les joueurs et le scouting',
        href: '/transfermarket',
        section: 'Navigation',
        keywords: ['players', 'scouting', 'market', 'marché'],
      },
      {
        id: 'comparison',
        label: 'Comparaison joueurs',
        description: 'Comparer plusieurs profils côte à côte',
        href: '/transfermarket/comparison',
        section: 'Navigation',
        keywords: ['compare', 'versus'],
      },
      {
        id: 'league',
        label: 'Ligue',
        description: 'Classement, calendrier et résultats',
        href: '/league',
        section: 'Navigation',
        keywords: ['standings', 'matches', 'schedule', 'classement'],
      },
      {
        id: 'custom',
        label: 'Custom',
        description: 'Archive custom et saisons dediees',
        href: '/custom',
        section: 'Navigation',
        keywords: ['custom', 'leaderboard', 'elo', 'discord'],
      },
    ];

    if (session?.user?.teamId) {
      items.push(
        {
          id: 'team-dashboard',
          label: 'Équipe',
          description: 'Gérer le roster et suivre les mouvements',
          href: '/team',
          section: 'Espace équipe',
          keywords: ['captain', 'roster', 'team'],
        },
        {
          id: 'team-contracts',
          label: 'Contrats',
          description: 'Prolonger, rompre ou proposer des contrats',
          href: '/team/contracts',
          section: 'Espace équipe',
          keywords: ['contracts', 'renew', 'prolonger', 'salary'],
        },
        {
          id: 'team-budget',
          label: 'Budget',
          description: 'Simuler la répartition salariale',
          href: '/team/budget',
          section: 'Espace équipe',
          keywords: ['salary', 'budget', 'finance'],
        },
      );
    }

    if (session?.user?.role === 'ADMIN') {
      items.push({
        id: 'admin',
        label: 'Administration',
        description: 'Opérations, joueurs, matchs et ligue',
        href: '/admin',
        section: 'Espace équipe',
        keywords: ['backoffice', 'ops', 'admin'],
      });
    }

    return items;
  }, [session?.user?.role, session?.user?.teamId]);

  const playerItems = useMemo<PaletteItem[]>(
    () =>
      (playersQuery.data ?? []).slice(0, 24).map((player) => ({
        id: `player-${player.id}`,
        label: player.displayName,
        description: `${player.role} · ${player.teamName}`,
        href: `/transfermarket/${player.id}`,
        section: 'Joueurs',
        keywords: [player.teamName, player.role, player.gameName, player.tagLine],
      })),
    [playersQuery.data],
  );

  const teamItems = useMemo<PaletteItem[]>(
    () =>
      (teamsQuery.data ?? []).slice(0, 12).map((team) => ({
        id: `team-${team.id}`,
        label: team.name,
        description: `${team.shortCode} · ${team._count.players} joueurs`,
        href: `/league/teams/${team.slug}`,
        section: 'Équipes',
        keywords: [team.shortCode, 'team'],
      })),
    [teamsQuery.data],
  );

  const items = useMemo(
    () => [...staticItems, ...playerItems, ...teamItems].filter((item) => includesQuery(item, query)),
    [playerItems, query, staticItems, teamItems],
  );

  const visibleItems = items.slice(0, 12);

  function handleSelect(item: PaletteItem) {
    setOpen(false);
    router.push(item.href);
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 bg-background/85 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="mx-auto mt-[10vh] w-full max-w-2xl border border-hairline bg-surface"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
              <Search className="h-4 w-4 text-foreground-muted" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActiveIndex((current) => Math.min(current + 1, visibleItems.length - 1));
                  }

                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActiveIndex((current) => Math.max(current - 1, 0));
                  }

                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const item = visibleItems[activeIndex];
                    if (item) {
                      handleSelect(item);
                    }
                  }
                }}
                placeholder="Rechercher une page, un joueur ou une équipe…"
                className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
              />
              <span className="hidden label-mono text-foreground-muted md:inline">Esc</span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {visibleItems.length > 0 ? (
                visibleItems.map((item, index) => {
                  const showSection =
                    index === 0 || visibleItems[index - 1]?.section !== item.section;
                  const isActive = index === activeIndex;
                  const isCurrent = pathname === item.href;

                  return (
                    <div key={item.id}>
                      {showSection ? (
                        <p className="label-mono px-5 pb-2 pt-4 text-foreground-muted">
                          {item.section}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        className={cn(
                          'group flex w-full items-center justify-between gap-4 border-l-2 px-5 py-3 text-left transition-colors duration-150',
                          isActive
                            ? 'border-accent bg-surface-hover text-foreground'
                            : 'border-transparent text-foreground-dim hover:bg-surface-hover hover:text-foreground',
                        )}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleSelect(item)}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">{item.label}</p>
                          <p className="mt-0.5 truncate text-xs text-foreground-muted">
                            {item.description}
                          </p>
                        </div>
                        <span className="flex shrink-0 items-center gap-2 label-mono text-foreground-muted">
                          {isCurrent ? <span>Actuel</span> : null}
                          <ArrowRight
                            className={cn(
                              'h-3.5 w-3.5 transition-transform duration-150',
                              isActive ? 'text-accent translate-x-0.5' : 'text-foreground-muted',
                            )}
                          />
                        </span>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="px-5 py-8 text-sm text-foreground-muted">
                  Aucun résultat pour cette recherche.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-hairline px-5 py-3 label-mono text-foreground-muted">
              <span>↑ ↓ pour naviguer</span>
              <span>↵ pour ouvrir</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
