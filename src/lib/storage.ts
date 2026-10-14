import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface FileRef {
  bucket: string;
  path: string;
}

const EXPIRY_SECONDS = 60 * 60 * 3;

/** Signs many files at once. Returns a map keyed by `${bucket}/${path}`. */
export async function signFiles(supabase: SupabaseClient, files: FileRef[]) {
  const urls: Record<string, string> = {};
  const byBucket = new Map<string, Set<string>>();
  for (const f of files) {
    if (!f?.path) continue;
    if (!byBucket.has(f.bucket)) byBucket.set(f.bucket, new Set());
    byBucket.get(f.bucket)!.add(f.path);
  }
  await Promise.all(
    [...byBucket.entries()].map(async ([bucket, paths]) => {
      const { data } = await supabase.storage.from(bucket).createSignedUrls([...paths], EXPIRY_SECONDS);
      for (const item of data ?? []) {
        if (item.signedUrl && item.path) urls[`${bucket}/${item.path}`] = item.signedUrl;
      }
    }),
  );
  return urls;
}

export const fileKey = (bucket: string, path: string) => `${bucket}/${path}`;
