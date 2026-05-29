import { useEffect } from "react";
import { getIngestStatus } from "../lib/api";
import { updateRepo } from "../lib/repos";

export function useIngestPoller(
  repoId: string,
  isIngesting: boolean,
  onUpdate: () => void
) {
  useEffect(() => {
    if (!isIngesting) return;

    let stopped = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      if (stopped) return;
      try {
        const res = await getIngestStatus(repoId);
        if (res.status === "done") {
          updateRepo(repoId, { status: "done" });
          onUpdate();
          return;
        }
        if (res.status === "failed") {
          updateRepo(repoId, { status: "failed" });
          onUpdate();
          return;
        }
      } catch {
        // backend temporarily unavailable — keep polling
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
  }, [repoId, isIngesting, onUpdate]);
}
