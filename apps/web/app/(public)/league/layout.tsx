import { LeagueSubNav } from '@/components/features/league/league-sub-nav';

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <LeagueSubNav />
      {children}
    </div>
  );
}
