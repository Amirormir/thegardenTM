export function resolveAccountAvatarUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) {
    return null;
  }

  if (rawUrl.startsWith('/')) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    return `/api/avatar?url=${encodeURIComponent(rawUrl)}`;
  } catch {
    return null;
  }
}
