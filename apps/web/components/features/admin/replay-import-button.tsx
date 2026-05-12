'use client';

import { Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ReplayImportError, importReplay } from '@/lib/replay/client';
import type { ParsedReplay } from '@/lib/validators/replay';

interface ReplayImportButtonProps {
  gameIndex: number;
  onImported: (gameIndex: number, parsed: ParsedReplay) => void;
  onError: (message: string) => void;
}

export function ReplayImportButton({ gameIndex, onImported, onError }: ReplayImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPending(true);
    try {
      const parsed = await importReplay(file);
      onImported(gameIndex, parsed);
    } catch (error) {
      const message =
        error instanceof ReplayImportError
          ? error.message
          : "Le replay n'a pas pu être importé.";
      onError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".rofl"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        icon={
          pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />
        }
        onClick={() => inputRef.current?.click()}
      >
        {pending ? 'Import…' : 'Importer .rofl'}
      </Button>
    </>
  );
}
