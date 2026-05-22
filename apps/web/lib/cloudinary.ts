import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfigured() {
  if (configured) return cloudinary;

  const url = process.env.CLOUDINARY_URL;
  if (!url) {
    throw new Error(
      'CLOUDINARY_URL is not set. Expected format: cloudinary://<api_key>:<api_secret>@<cloud_name>',
    );
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'cloudinary:') {
      throw new Error('CLOUDINARY_URL must use the cloudinary:// protocol');
    }
    cloudinary.config({
      cloud_name: parsed.hostname,
      api_key: decodeURIComponent(parsed.username),
      api_secret: decodeURIComponent(parsed.password),
      secure: true,
    });
    configured = true;
  } catch (error) {
    throw new Error(
      `Invalid CLOUDINARY_URL: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return cloudinary;
}

interface UploadInput {
  data: Buffer | string;
  folder?: string;
  publicIdHint?: string;
}

export interface UploadResult {
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
  bytes: number;
  format: string;
}

export async function uploadToCloudinary({
  data,
  folder = 'nexus-league',
  publicIdHint,
}: UploadInput): Promise<UploadResult> {
  const client = ensureConfigured();

  return new Promise<UploadResult>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        ...(publicIdHint ? { public_id: publicIdHint } : {}),
        resource_type: 'image',
        overwrite: false,
        unique_filename: true,
        use_filename: false,
      },
      (error, result) => {
        if (error || !result) {
          const reason =
            error instanceof Error
              ? error
              : new Error(
                  error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
                    ? error.message
                    : 'Cloudinary upload returned no result.',
                );
          reject(reason);
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width ?? null,
          height: result.height ?? null,
          bytes: result.bytes ?? 0,
          format: result.format ?? 'unknown',
        });
      },
    );

    if (typeof data === 'string') {
      stream.end(Buffer.from(data));
    } else {
      stream.end(data);
    }
  });
}

export async function uploadRemoteUrlToCloudinary(
  sourceUrl: string,
  options: { folder?: string; timeoutMs?: number; maxBytes?: number } = {},
): Promise<UploadResult> {
  const { folder, timeoutMs = 15_000, maxBytes = 10 * 1024 * 1024 } = options;

  let response: Response;
  try {
    response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NexusLeagueBot/1.0; +https://nexus-league.app)',
        Accept: 'image/*',
      },
      redirect: 'follow',
    });
  } catch (error) {
    throw new Error(
      `Échec du téléchargement depuis l'URL source : ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    throw new Error(`La source a renvoyé HTTP ${response.status}.`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    throw new Error(
      `L'URL source ne pointe pas vers une image (content-type=${contentType || 'inconnu'}). Si tu colles un lien de page Pinterest, ouvre l'image en plein écran et copie l'URL directe.`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxBytes) {
    throw new Error(
      `L'image source pèse ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB (max ${maxBytes / 1024 / 1024} MB).`,
    );
  }

  return uploadToCloudinary({
    data: Buffer.from(arrayBuffer),
    ...(folder ? { folder } : {}),
  });
}
