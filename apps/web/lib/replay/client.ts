import { parsedReplaySchema, type ParsedReplay } from '@/lib/validators/replay';

export class ReplayImportError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ReplayImportError';
  }
}

export async function importReplay(file: File): Promise<ParsedReplay> {
  console.log('[replay-client] importReplay start', {
    name: file.name,
    size: file.size,
    type: file.type,
  });

  if (!file.name.toLowerCase().endsWith('.rofl')) {
    throw new ReplayImportError('Le fichier doit être un .rofl.');
  }

  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch('/api/admin/replays/parse', {
      method: 'POST',
      body: formData,
    });
  } catch (cause) {
    console.error('[replay-client] fetch threw', cause);
    throw new ReplayImportError(
      'Impossible de joindre le service de replay. Est-il bien démarré ?',
    );
  }

  console.log('[replay-client] response', {
    status: response.status,
    contentType: response.headers.get('content-type'),
  });

  if (!response.ok) {
    let detail = `Erreur ${response.status}`;
    const raw = await response.text();
    console.error('[replay-client] error body', raw.slice(0, 500));
    try {
      const body = JSON.parse(raw) as { detail?: string; error?: string };
      detail = body.detail ?? body.error ?? detail;
    } catch {
      // not JSON — keep status code message
      if (raw && raw.length < 200) detail = `${detail}: ${raw}`;
    }
    throw new ReplayImportError(detail, response.status);
  }

  const json = (await response.json()) as unknown;
  const parsed = parsedReplaySchema.safeParse(json);
  if (!parsed.success) {
    console.error('[replay-client] zod validation failed', parsed.error.issues);
    throw new ReplayImportError(
      'Réponse du service de replay invalide. Vérifie les versions.',
    );
  }
  console.log('[replay-client] success', {
    players: parsed.data.players.length,
    teams: parsed.data.teams.length,
  });
  return parsed.data;
}
