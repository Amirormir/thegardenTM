'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils/cn';

interface CostFiltersProps {
  role?: string | undefined;
}

const DEBOUNCE_MS = 200;

function buildQuery(values: { role: string }) {
  const params = new URLSearchParams();
  params.set('view', 'cost');
  if (values.role && values.role !== 'all') params.set('role', values.role);
  return `/transfermarket?${params.toString()}`;
}

export function CostFilters({ role }: CostFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [roleValue, setRoleValue] = useState(role ?? 'all');

  const lastPushedRef = useRef<string>(searchParams.toString());

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const url = buildQuery({ role: roleValue });
      const nextParams = url.includes('?') ? url.split('?')[1] ?? '' : '';
      if (nextParams === lastPushedRef.current) return;
      lastPushedRef.current = nextParams;
      startTransition(() => {
        router.replace(url, { scroll: false });
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [roleValue, router]);

  function handleReset() {
    setRoleValue('all');
    lastPushedRef.current = 'view=cost';
    startTransition(() => {
      router.replace('/transfermarket?view=cost', { scroll: false });
    });
  }

  return (
    <form
      action="/transfermarket"
      onSubmit={(event) => event.preventDefault()}
      className="grid gap-4 border-y border-hairline bg-surface px-5 py-5 md:grid-cols-[200px_auto] md:items-end md:gap-5 md:px-6"
    >
      <input type="hidden" name="view" value="cost" />
      <label className="flex flex-col gap-2">
        <span className="label-mono">Rôle principal</span>
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
      <div className="flex items-center gap-3">
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
