'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ChampionOption {
  id: string;
  name: string;
}

interface ChampionSelectProps {
  champions: ChampionOption[];
  name: string;
  value?: string;
  required?: boolean;
  placeholder?: string;
  onChange?: (championId: string) => void;
}

export function ChampionSelect({
  champions,
  name,
  value,
  required,
  placeholder = 'Champion',
  onChange,
}: ChampionSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(value ?? '');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? champions.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : champions;

  const selectedChampion = champions.find((c) => c.id === selected);

  useEffect(() => {
    if (value !== undefined) setSelected(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  function handleSelect(championId: string) {
    setSelected(championId);
    setOpen(false);
    setSearch('');
    onChange?.(championId);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none transition focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/24',
          selected ? 'text-white' : 'text-text-muted',
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedChampion ? (
            <>
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/15.6.1/img/champion/${selectedChampion.id}.png`}
                alt={selectedChampion.name}
                className="h-6 w-6 rounded"
              />
              {selectedChampion.name}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
      </button>

      {required && !selected ? (
        <input
          tabIndex={-1}
          className="pointer-events-none absolute inset-0 h-0 w-0 opacity-0"
          required
          value=""
          onChange={() => {}}
        />
      ) : null}

      {open ? (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-2xl border border-white/10 bg-bg-elevated shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
            <Search className="h-4 w-4 text-text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-text-muted"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((champion) => (
                <button
                  key={champion.id}
                  type="button"
                  onClick={() => handleSelect(champion.id)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/8',
                    selected === champion.id
                      ? 'bg-accent-primary/14 text-white'
                      : 'text-text-secondary',
                  )}
                >
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/15.6.1/img/champion/${champion.id}.png`}
                    alt={champion.name}
                    className="h-6 w-6 rounded"
                  />
                  {champion.name}
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-sm text-text-muted">Aucun champion.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
