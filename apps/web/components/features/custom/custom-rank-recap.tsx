import { Card } from '@/components/ui/card';
import { CUSTOM_PLACEMENT_GAMES, CUSTOM_RANKS } from '@/lib/custom/ranks';
import { CustomRankBadge } from './custom-rank-badge';

export function CustomRankRecap() {
  return (
    <section className="flex flex-col gap-8 border border-hairline bg-surface px-5 py-6 md:px-6">
      <div className="flex flex-col gap-3 border-b border-hairline pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label-mono">Recap des ranks</p>
          <h2 className="mt-3 display-md text-foreground">Paliers du ladder custom.</h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-foreground-dim">
          Placements pendant les {CUSTOM_PLACEMENT_GAMES} premieres games, puis progression sur un
          score affiche de 0 a 100. Chaque rank se decoupe en III / II / I par tranches de 5.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.55fr_1.45fr]">
        <Card elevated className="hover:bg-surface">
          <p className="label-mono">Placements</p>
          <h3 className="mt-3 text-xl text-foreground">Avant le ladder public</h3>
          <p className="mt-3 text-sm leading-6 text-foreground-dim">
            Tant qu&apos;un joueur n&apos;a pas atteint {CUSTOM_PLACEMENT_GAMES} games, il reste en
            placements et n&apos;apparait pas dans le classement public du site.
          </p>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {CUSTOM_RANKS.map((rank) => (
            <Card key={rank.key} elevated className="hover:bg-surface">
              <CustomRankBadge tier={rank.key} size="lg" />
              <p className="mt-4 label-mono">
                {rank.min}-{rank.max}
              </p>
              <p className="mt-2 text-sm text-foreground">{rank.accent}</p>
              <p className="mt-2 text-xs leading-5 text-foreground-dim">
                III: {rank.min}-{Math.min(rank.min + 4, rank.max)} · II:{' '}
                {Math.min(rank.min + 5, rank.max)}-{Math.min(rank.min + 9, rank.max)} · I:{' '}
                {Math.min(rank.min + 10, rank.max)}-{rank.max}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
