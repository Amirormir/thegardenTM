import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils/cn';

interface MarketFiltersProps {
  search?: string | undefined;
  role?: string | undefined;
  sort?: string | undefined;
}

export function MarketFilters({ search, role, sort }: MarketFiltersProps) {
  return (
    <Card className="grid gap-3 md:min-w-[640px] md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
      <form action="/transfermarket" className="contents">
        <Input
          name="q"
          variant="search"
          placeholder="Rechercher un joueur, une team ou un tag"
          defaultValue={search}
        />
        <Select name="role" defaultValue={role ?? 'all'}>
          <option value="all">Tous les roles</option>
          <option value="TOP">Top</option>
          <option value="JUNGLE">Jungle</option>
          <option value="MID">Mid</option>
          <option value="ADC">ADC</option>
          <option value="SUPPORT">Support</option>
        </Select>
        <Select name="sort" defaultValue={sort ?? 'marketValue-desc'}>
          <option value="marketValue-desc">Valeur decroissante</option>
          <option value="marketValue-asc">Valeur croissante</option>
          <option value="salary-desc">Salaire decroissant</option>
          <option value="salary-asc">Salaire croissant</option>
          <option value="name-asc">Nom A-Z</option>
        </Select>
        <div className="flex items-center gap-2">
          <Button type="submit" size="md">
            Filtrer
          </Button>
          <Link
            href="/transfermarket"
            className={cn(buttonVariants({ variant: 'ghost', size: 'md' }))}
          >
            Reset
          </Link>
        </div>
      </form>
    </Card>
  );
}
