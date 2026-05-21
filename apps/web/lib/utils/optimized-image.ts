const DIRECT_REMOTE_HOSTS = new Set([
  'res.cloudinary.com',
  'cdn.discordapp.com',
  'ddragon.leagueoflegends.com',
  'raw.communitydragon.org',
]);

function transformCloudinaryUrl(rawUrl: string, width: number) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname !== 'res.cloudinary.com') {
      return rawUrl;
    }

    const uploadSegment = '/upload/';
    const markerIndex = parsed.pathname.indexOf(uploadSegment);
    if (markerIndex === -1) {
      return rawUrl;
    }

    const beforeUpload = parsed.pathname.slice(0, markerIndex + uploadSegment.length);
    const afterUpload = parsed.pathname.slice(markerIndex + uploadSegment.length);
    const transformations = `f_auto,q_auto,c_limit,w_${width}`;

    if (afterUpload.startsWith(transformations)) {
      return rawUrl;
    }

    parsed.pathname = `${beforeUpload}${transformations}/${afterUpload}`;
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function getOptimizedRemoteImageUrl(
  rawUrl: string | null | undefined,
  options?: { width?: number },
) {
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

    if (parsed.hostname === 'res.cloudinary.com') {
      return transformCloudinaryUrl(rawUrl, options?.width ?? 1200);
    }

    if (DIRECT_REMOTE_HOSTS.has(parsed.hostname)) {
      return rawUrl;
    }

    return `/api/avatar?url=${encodeURIComponent(rawUrl)}`;
  } catch {
    return null;
  }
}
