import Link from 'next/link';
import { ArrowRightLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface TransferOfferButtonProps {
  playerId: string;
}

export function TransferOfferButton({ playerId }: TransferOfferButtonProps) {
  return (
    <Link
      href={`/team/transfers/new/${playerId}`}
      className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'inline-flex items-center gap-2')}
    >
      <ArrowRightLeft className="h-4 w-4" />
      Faire une offre
    </Link>
  );
}
