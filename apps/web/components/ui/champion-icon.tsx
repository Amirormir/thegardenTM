import { cn } from '@/lib/utils/cn';

interface ChampionIconProps {
  championId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-9 w-9',
} as const;

export function ChampionIcon({ championId, size = 'md', className }: ChampionIconProps) {
  const src = `https://ddragon.leagueoflegends.com/cdn/15.6.1/img/champion/${championId}.png`;

  return (
    <img
      src={src}
      alt={championId}
      className={cn('rounded-md', SIZE_CLASSES[size], className)}
    />
  );
}
