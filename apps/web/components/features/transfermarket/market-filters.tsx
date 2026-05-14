'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils/cn';

interface MarketFiltersProps {
  search?: string | undefined;
  role?: string | undefined;
  sort?: string | undefined;
}

const DEBOUNCE_MS = 300;

function buildQuery(values: { q: string; role: string; sort: string }) {
  const params = new URLSearchParams();
  if (values.q.trim()) params.set('q', values.q.trim());
  if (values.role && values.role !== 'all') params.set('role', values.role);
  if (values.sort && values.sort !== 'marketValue-desc') params.set('sort', values.sort);
  const queryString = params.toString();
  return queryString ? `/transfermarket?${queryString}` : '/transfermarket';
}

export function MarketFilters({ search, role, sort }: MarketFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(search ?? '');
  const [roleValue, setRoleValue] = useState(role ?? 'all');
  const [sortValue, setSortValue] = useState(sort ?? 'marketValue-desc');

  const lastPushedRef = useRef<string>(searchParams.toString());

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const url = buildQuery({ q, role: roleValue, sort: sortValue });
      const nextParams = url.includes('?') ? url.split('?')[1] ?? '' : '';
      if (nextParams === lastPushedRef.current) return;
      lastPushedRef.current = nextParams;
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [q, roleValue, sortValue, router]);

  function handleReset() {
    setQ('');
    setRoleValue('all');
    setSortValue('marketValue-desc');
    lastPushedRef.current = '';
    startTransition(() => {
      router.replace('/transfermarket', { scroll: false });
    });
  }

  return (
    <form
      action="/transfermarket"
      onSubmit={(event) => event.preventDefault()}
      className="grid gap-4 border-y border-hairline bg-surface px-5 py-5 md:grid-cols-[minmax(0,1fr)_180px_200px_auto] md:items-end md:gap-5 md:px-6"
    >
      <label className="flex flex-col gap-2">
        <span className="label-mono">Recherche</span>
        <Input
          name="q"
          variant="search"
          placeholder="Joueur, team ou tag"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="label-mono">Rôle</span>
        <Select
          name="role"
          value={roleValue}
          onChange={(event) => setRoleValue(event.target.value)}
        >
          <option value="all">Tous les rôles</option>
          <option value="TOP">Top</option>
          <option value="JUNGLE">Jungle</option>
          <option value="MID">Mid</option>
          <option value="ADC">ADC</option>
          <option value="SUPPORT">Support</option>
        </Select>
      </label>
      <label className="flex flex-col gap-2">
        <span className="label-mono">Tri</span>
        <Select
          name="sort"
          value={sortValue}
          onChange={(event) => setSortValue(event.target.value)}
        >
          <option value="marketValue-desc">Valeur décroissante</option>
          <option value="marketValue-asc">Valeur croissante</option>
          <option value="salary-desc">Salaire décroissant</option>
          <option value="salary-asc">Salaire croissant</option>
          <option value="name-asc">Nom A-Z</option>
        </Select>
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" size="md">
          Filtrer
        </Button>
        <button
          type="button"
          onClick={handleReset}
          className={cn(buttonVariants({ variant: 'ghost', size: 'md' }))}
        >
          Réinitialiser
        </button>
      </div>
    </form>
  );
}
