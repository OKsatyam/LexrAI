import { useEffect } from "react";
import { getImproveStatus } from "../lib/api";
import type { ImproveStatusResponse } from "../lib/types";

export function useImprovePoller(
  repoId: string,
  active: boolean,
  onUpdate: (data: ImproveStatusResponse) => void,
  onDone: () => void
) {
  useEffect(() => {
    if (!active) return;

    let stopped = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      if (stopped) return;
      try {
        const res = await getImproveStatus(repoId);
        onUpdate(res);
        if (res.status === "done" || res.status === "failed") {
          onDone();
          return;
        }
      } catch {
        // backend temporarily unavailable
      }
      if (!stopped) {
        timeoutId = setTimeout(poll, 2000);
      }
    }

    poll();
    return () => {
      stopped = true;
      clearTimeout(timeoutId);
    };
  }, [repoId, active, onUpdate, onDone]);
}
