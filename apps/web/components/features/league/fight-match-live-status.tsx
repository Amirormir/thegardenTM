'use client';

import { useEffect, useState } from 'react';

interface FightMatchLiveStatusProps {
  isCompleted: boolean;
  scheduledAt: string | Date;
}

export function FightMatchLiveStatus({
  isCompleted,
  scheduledAt,
}: FightMatchLiveStatusProps) {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!isCompleted) {
      setIsLive(new Date(scheduledAt).getTime() <= Date.now());
    }
  }, [isCompleted, scheduledAt]);

  if (isLive) {
    return (
      <span className="inline-flex items-center gap-2 text-accent">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
        En direct
      </span>
    );
  }

  return <span>{isCompleted ? 'Final' : 'Programmé'}</span>;
}
