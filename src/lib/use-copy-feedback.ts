"use client";

import { useCallback, useState } from "react";

export function useCopyFeedback(resetMs = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (value: string) => {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), resetMs);
    },
    [resetMs]
  );

  return { copied, copy };
}
