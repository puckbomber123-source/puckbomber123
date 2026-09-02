import { supabase } from './supabase';

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-r2`;

export async function uploadToR2(file: File, path: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

  const form = new FormData();
  form.append('file', file);
  form.append('path', path);

  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload failed (${res.status})`);
  }

  const { url } = await res.json();
  return url as string;
}

export function buildR2Path(reportId: string, filename: string): string {
  const safe = filename.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-');
  return `service-reports/${reportId}/${Date.now()}-${safe}`;
}
