import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
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
    <form
      action="/transfermarket"
      className="grid gap-4 border-y border-hairline bg-surface px-5 py-5 md:grid-cols-[minmax(0,1fr)_180px_200px_auto] md:items-end md:gap-5 md:px-6"
    >
      <label className="flex flex-col gap-2">
        <span className="label-mono">Recherche</span>
        <Input
          name="q"
          variant="search"
          placeholder="Joueur, team ou tag"
          defaultValue={search}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="label-mono">Rôle</span>
        <Select name="role" defaultValue={role ?? 'all'}>
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
        <Select name="sort" defaultValue={sort ?? 'marketValue-desc'}>
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
        <Link
          href="/transfermarket"
          className={cn(buttonVariants({ variant: 'ghost', size: 'md' }))}
        >
          Réinitialiser
        </Link>
      </div>
    </form>
  );
}
