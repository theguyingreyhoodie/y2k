import { useEffect } from "react";

const BASE = "Y2KEDIT";
const DEFAULT = "Y2KEDIT · make your photos hopelessly Y2K";

/** Names the browser tab after the page, and puts the default back when the page goes away. */
export function useTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : DEFAULT;
    return () => {
      document.title = DEFAULT;
    };
  }, [title]);
}
