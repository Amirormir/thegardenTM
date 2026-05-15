'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Select } from '@/components/ui/select';

interface CustomResultsDateSelectProps {
  availableDates: { value: string; label: string; count: number }[];
  selectedDate: string;
}

export function CustomResultsDateSelect({
  availableDates,
  selectedDate,
}: CustomResultsDateSelectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextDate: string) {
    if (!nextDate || nextDate === selectedDate) return;

    const params = new URLSearchParams(searchParams.toString());
    if (availableDates[0]?.value === nextDate) {
      params.delete('date');
    } else {
      params.set('date', nextDate);
    }

    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <label className="flex w-full max-w-xs flex-col gap-2">
      <span className="label-mono">Date des customs</span>
      <Select
        aria-label="Filtrer les customs par date"
        value={selectedDate}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value)}
      >
        {availableDates.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label} · {entry.count} custom{entry.count > 1 ? 's' : ''}
          </option>
        ))}
      </Select>
    </label>
  );
}
