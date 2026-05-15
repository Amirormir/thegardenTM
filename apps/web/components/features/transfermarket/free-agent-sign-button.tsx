import Link from 'next/link';
import { FileText } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface FreeAgentSignButtonProps {
  playerId: string;
}

export function FreeAgentSignButton({ playerId }: FreeAgentSignButtonProps) {
  return (
    <Link
      href={`/team/contracts/negotiate/${playerId}`}
      className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'inline-flex items-center gap-2')}
    >
      <FileText className="h-4 w-4" />
      Signer ce free agent
    </Link>
  );
}
