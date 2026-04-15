import { LeagueSubNav } from '@/components/features/league/league-sub-nav';

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <LeagueSubNav />
      {children}
    </div>
  );
}
