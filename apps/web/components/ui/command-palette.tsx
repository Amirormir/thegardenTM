'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Command, Search } from 'lucide-react';
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        label: 'Home',
        description: 'Retour a la page d accueil',
        href: '/',
        section: 'Navigation',
        keywords: ['landing', 'dashboard'],
      },
      {
        id: 'transfermarket',
        label: 'Transfermarket',
        description: 'Parcourir les joueurs et le scouting',
        href: '/transfermarket',
        section: 'Navigation',
        keywords: ['players', 'scouting', 'market'],
      },
      {
        id: 'comparison',
        label: 'Player comparison',
        description: 'Comparer plusieurs profils cote a cote',
        href: '/transfermarket/comparison',
        section: 'Navigation',
        keywords: ['compare', 'versus'],
      },
      {
        id: 'league',
        label: 'League',
        description: 'Classement, calendrier et resultats',
        href: '/league',
        section: 'Navigation',
        keywords: ['standings', 'matches', 'schedule'],
      },
    ];

    if (session?.user?.teamId) {
      items.push(
        {
          id: 'team-dashboard',
          label: 'Team dashboard',
          description: 'Gerer le roster et suivre les mouvements',
          href: '/team',
          section: 'Workspace',
          keywords: ['captain', 'roster', 'team'],
        },
        {
          id: 'team-contracts',
          label: 'Team contracts',
          description: 'Prolonger, rompre ou proposer des contrats',
          href: '/team/contracts',
          section: 'Workspace',
          keywords: ['contracts', 'renew', 'prolonger', 'salary'],
        },
        {
          id: 'team-budget',
          label: 'Budget calculator',
          description: 'Simuler la repartition salariale',
          href: '/team/budget',
          section: 'Workspace',
          keywords: ['salary', 'budget', 'finance'],
        },
      );
    }

    if (session?.user?.role === 'ADMIN') {
      items.push({
        id: 'admin',
        label: 'Admin area',
        description: 'Operations, joueurs, matchs et ligue',
        href: '/admin',
        section: 'Workspace',
        keywords: ['backoffice', 'ops'],
      });
    }

    return items;
  }, [session?.user?.role, session?.user?.teamId]);

  const playerItems = useMemo<PaletteItem[]>(
    () =>
      (playersQuery.data ?? []).slice(0, 24).map((player) => ({
        id: `player-${player.id}`,
        label: player.displayName,
        description: `${player.role} / ${player.teamName}`,
        href: `/transfermarket/${player.id}`,
        section: 'Players',
        keywords: [player.teamName, player.role, player.gameName, player.tagLine],
      })),
    [playersQuery.data],
  );

  const teamItems = useMemo<PaletteItem[]>(
    () =>
      (teamsQuery.data ?? []).slice(0, 12).map((team) => ({
        id: `team-${team.id}`,
        label: team.name,
        description: `${team.shortCode} / ${team._count.players} joueurs`,
        href: `/league/teams/${team.slug}`,
        section: 'Teams',
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
    <>
      <button
        type="button"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#12111a]/90 px-4 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur-xl transition hover:border-accent-primary/40 hover:bg-[#181624]"
        onClick={() => setOpen(true)}
      >
        <Command className="h-4 w-4" />
        Quick actions
        <span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-text-secondary md:inline-flex">
          Ctrl K
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="mx-auto mt-[10vh] w-full max-w-3xl rounded-[32px] border border-white/10 bg-[#111019]/96 shadow-2xl"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
                <Search className="h-4 w-4 text-text-secondary" />
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
                  placeholder="Rechercher une page, un joueur ou une equipe..."
                  className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-text-muted"
                />
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-3">
                {visibleItems.length > 0 ? (
                  visibleItems.map((item, index) => {
                    const showSection =
                      index === 0 || visibleItems[index - 1]?.section !== item.section;

                    return (
                      <div key={item.id}>
                        {showSection ? (
                          <p className="px-3 pb-2 pt-3 text-xs uppercase tracking-[0.18em] text-text-secondary">
                            {item.section}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          className={cn(
                            'flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition',
                            index === activeIndex
                              ? 'bg-accent-primary/16 text-white'
                              : 'text-text-secondary hover:bg-white/5 hover:text-white',
                            pathname === item.href && 'ring-1 ring-accent-primary/24',
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => handleSelect(item)}
                        >
                          <div>
                            <p className="font-semibold">{item.label}</p>
                            <p className="mt-1 text-sm text-text-secondary">{item.description}</p>
                          </div>
                          <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                            Open
                          </span>
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-6 text-sm text-text-secondary">
                    Aucun resultat pour cette recherche.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
