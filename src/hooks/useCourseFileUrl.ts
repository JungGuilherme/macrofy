import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a course-files reference into a usable URL.
 * Accepts either a stored relative path (preferred) or a legacy public URL.
 * For paths, generates a short-lived signed URL (1h).
 */
export function useCourseFileUrl(value: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setUrl(null);
      return;
    }
    // If it's already a full URL, use as-is (legacy public URLs may break once bucket is private).
    if (/^https?:\/\//i.test(value)) {
      setUrl(value);
      return;
    }
    supabase.storage
      .from("course-files")
      .createSignedUrl(value, 3600)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return url;
}
