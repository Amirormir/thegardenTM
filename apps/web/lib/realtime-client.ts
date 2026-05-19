export type RealtimeControlAction = 'start' | 'pause' | 'resume' | 'cancel';

interface ControlResult {
  ok: boolean;
  code?: string | undefined;
  message?: string | undefined;
  state?: unknown;
}

function getConfig(): { url: string; secret: string } {
  const url = process.env.REALTIME_URL;
  const secret = process.env.INTERNAL_API_SECRET;
  if (!url) throw new Error('Missing REALTIME_URL');
  if (!secret) throw new Error('Missing INTERNAL_API_SECRET');
  return { url: url.replace(/\/$/, ''), secret };
}

export async function callRealtimeControl(
  draftId: string,
  action: RealtimeControlAction,
): Promise<ControlResult> {
  const { url, secret } = getConfig();
  const response = await fetch(`${url}/control/${draftId}/${action}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-secret': secret,
    },
    body: '{}',
    signal: AbortSignal.timeout(8000),
  });

  let body: ControlResult;
  try {
    body = (await response.json()) as ControlResult;
  } catch {
    body = { ok: false, code: 'INVALID_RESPONSE' };
  }

  if (!response.ok) {
    return { ok: false, code: body.code ?? 'REALTIME_ERROR', message: body.message };
  }
  return body;
}
