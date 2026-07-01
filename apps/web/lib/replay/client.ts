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

interface UploadTicket {
  uploadUrl: string;
  token: string;
  exp: number;
}

function ensureDirectUploadTarget(ticket: UploadTicket): UploadTicket {
  let uploadUrl: URL;
  try {
    uploadUrl = new URL(ticket.uploadUrl, window.location.href);
  } catch {
    throw new ReplayImportError("L'URL d'upload du replay est invalide.");
  }

  if (!['http:', 'https:'].includes(uploadUrl.protocol)) {
    throw new ReplayImportError("L'URL d'upload du replay doit utiliser HTTP ou HTTPS.");
  }

  if (uploadUrl.origin === window.location.origin) {
    throw new ReplayImportError(
      "Configuration replay invalide : l'upload .rofl pointe vers l'application web au lieu du microservice replay.",
    );
  }

  return {
    ...ticket,
    uploadUrl: uploadUrl.toString(),
  };
}

async function fetchUploadTicket(): Promise<UploadTicket> {
  let response: Response;
  try {
    response = await fetch('/api/admin/replays/ticket', { method: 'POST' });
  } catch (cause) {
    console.error('[replay-client] ticket fetch threw', cause);
    throw new ReplayImportError("Impossible de préparer l'upload du replay.");
  }

  if (!response.ok) {
    let detail = `Erreur ${response.status}`;
    const raw = await response.text();
    try {
      const body = JSON.parse(raw) as { error?: string };
      detail = body.error ?? detail;
    } catch {
      if (raw && raw.length < 200) detail = `${detail}: ${raw}`;
    }
    throw new ReplayImportError(detail, response.status);
  }

  return ensureDirectUploadTarget((await response.json()) as UploadTicket);
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

  // 1) Demander un ticket signe a Vercel (admin-only, rate-limite).
  const ticket = await fetchUploadTicket();

  // 2) Uploader le fichier DIRECTEMENT au microservice Railway, sans transiter
  //    par Vercel (limite de 4,5 Mo des fonctions serverless).
  const formData = new FormData();
  formData.append('file', file, file.name);

  let response: Response;
  try {
    response = await fetch(ticket.uploadUrl, {
      method: 'POST',
      body: formData,
      ...(ticket.token ? { headers: { Authorization: `Bearer ${ticket.token}` } } : {}),
    });
  } catch (cause) {
    console.error('[replay-client] upload fetch threw', cause);
    throw new ReplayImportError(
      'Impossible de joindre le service de replay. Est-il bien démarré et accessible ?',
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
      if (raw && raw.length < 200) detail = `${detail}: ${raw}`;
    }
    throw new ReplayImportError(detail, response.status);
  }

  const json = (await response.json()) as unknown;
  const parsed = parsedReplaySchema.safeParse(json);
  if (!parsed.success) {
    console.error('[replay-client] zod validation failed', parsed.error.issues);
    throw new ReplayImportError('Réponse du service de replay invalide. Vérifie les versions.');
  }
  console.log('[replay-client] success', {
    players: parsed.data.players.length,
    teams: parsed.data.teams.length,
  });
  return parsed.data;
}
