'use client';

import { CloudUpload, Globe, Loader2, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

interface UploadResponse {
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
  bytes: number;
  format: string;
}

type Folder = 'players' | 'teams' | 'articles';

interface ImageInputProps {
  value: string;
  onChange: (url: string) => void;
  folder: Folder;
  label?: string;
  placeholder?: string;
  previewClassName?: string;
  required?: boolean;
  hidePreview?: boolean;
}

export function ImageInput({
  value,
  onChange,
  folder,
  label,
  placeholder = 'https://res.cloudinary.com/.../image.jpg',
  previewClassName,
  required = false,
  hidePreview = false,
}: ImageInputProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'file' | 'url' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');

  async function handleFile(file: File) {
    setError(null);
    setBusy('file');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as UploadResponse | { error?: string } | null;
      if (!response.ok || !payload || !('url' in payload)) {
        const message =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : `Upload échoué (HTTP ${response.status}).`;
        setError(message);
        return;
      }

      onChange(payload.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload échoué.');
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoteImport() {
    const trimmed = sourceUrl.trim();
    if (trimmed.length === 0) {
      setError("Colle d'abord une URL d'image.");
      return;
    }
    setError(null);
    setBusy('url');
    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl: trimmed, folder }),
      });

      const payload = (await response.json().catch(() => null)) as UploadResponse | { error?: string } | null;
      if (!response.ok || !payload || !('url' in payload)) {
        const message =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : `Import échoué (HTTP ${response.status}).`;
        setError(message);
        return;
      }

      onChange(payload.url);
      setSourceUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import échoué.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {label ? <label className="label-mono">{label}</label> : null}

      <div className="flex flex-col gap-2">
        <Input
          type="url"
          value={value}
          placeholder={placeholder}
          required={required}
          readOnly
          onChange={() => {
            /* read-only — modifie via les boutons ci-dessous */
          }}
        />
        <p className="label-mono text-foreground-muted">
          {value
            ? value.includes('res.cloudinary.com')
              ? 'Image hébergée sur Cloudinary'
              : 'URL externe (sera remplacée si tu réimportes)'
            : 'Aucune image — uploade un fichier ou importe une URL'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="flex flex-col gap-2">
          <label htmlFor={inputId} className="label-mono text-foreground-muted">
            Importer depuis URL (Pinterest, etc.)
          </label>
          <Input
            id={inputId}
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://i.pinimg.com/..."
            disabled={busy !== null}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy !== null || sourceUrl.trim().length === 0}
          icon={busy === 'url' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
          onClick={handleRemoteImport}
        >
          Importer
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy !== null}
          icon={busy === 'file' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
          onClick={() => fileInputRef.current?.click()}
        >
          Uploader un fichier
        </Button>
        {value ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy !== null}
            icon={<X className="h-3.5 w-3.5" />}
            onClick={() => onChange('')}
          >
            Retirer
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="border-l-2 border-l-[color:var(--loss)] border-y border-r border-hairline bg-surface px-4 py-3 text-xs text-[color:var(--loss)]">
          {error}
        </div>
      ) : null}

      {value && !hidePreview ? (
        <div
          className={cn(
            'relative h-48 w-full overflow-hidden border border-hairline bg-surface',
            previewClassName,
          )}
        >
          <img
            src={value}
            alt="Aperçu"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}
