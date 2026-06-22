import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { GenerationJob } from "@voice-of-fish/shared";
import { studioClient } from "@/lib/tauri";
import { useGenerationStore } from "@/stores/useGenerationStore";
import { useAppStore } from "@/stores/useAppStore";

const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 3600; // 30 minutes at 500 ms
const MAX_CONSECUTIVE_POLL_ERRORS = 3;

interface UseGenerationPollingOptions {
  onCompletedJob: (job: GenerationJob) => void;
}

interface UseGenerationPollingResult {
  startPolling: () => void;
  stopPolling: () => void;
  cancelJob: (jobId: string) => Promise<void>;
}

export function useGenerationPolling({
  onCompletedJob,
}: UseGenerationPollingOptions): UseGenerationPollingResult {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);
  const consecutiveErrorsRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    // Avoid parallel intervals.
    stopPolling();
    attemptsRef.current = 0;
    consecutiveErrorsRef.current = 0;

    intervalRef.current = setInterval(async () => {
      attemptsRef.current += 1;

      if (attemptsRef.current > MAX_POLL_ATTEMPTS) {
        stopPolling();
        useGenerationStore.getState().setStatus("failed");
        useAppStore.getState().setFooterStatus("error");
        toast.error("Generation timed out");
        return;
      }

      try {
        const active = await studioClient.getActiveJob();
        consecutiveErrorsRef.current = 0;

        if (!active) {
          stopPolling();
          useGenerationStore.getState().setStatus("completed");
          useAppStore.getState().setFooterStatus("ready");
          queryClient.invalidateQueries({ queryKey: ["history"] });
          return;
        }

        if (active.status === "completed") {
          stopPolling();
          onCompletedJob(active);
          useGenerationStore.getState().setStatus("completed");
          useAppStore.getState().setFooterStatus("ready");
          queryClient.invalidateQueries({ queryKey: ["history"] });
          toast.success("Generation completed");
        } else if (active.status === "failed") {
          stopPolling();
          onCompletedJob(active);
          useGenerationStore.getState().setStatus("failed");
          useAppStore.getState().setFooterStatus("error");
          queryClient.invalidateQueries({ queryKey: ["history"] });
          toast.error(`Generation failed: ${active.error ?? "unknown error"}`);
        } else if (active.status === "cancelled") {
          stopPolling();
          onCompletedJob(active);
          useGenerationStore.getState().setStatus("cancelled");
          useAppStore.getState().setFooterStatus("ready");
          queryClient.invalidateQueries({ queryKey: ["history"] });
        }
        // "generating" → keep polling
      } catch {
        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_POLL_ERRORS) {
          stopPolling();
          useGenerationStore.getState().setStatus("failed");
          useAppStore.getState().setFooterStatus("error");
          toast.error("Generation polling failed");
        }
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling, onCompletedJob, queryClient]);

  // Unmount cleanup.
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const cancelJob = useCallback(
    async (jobId: string): Promise<void> => {
      // Capture prior state so the optimistic UI can be rolled back
      // if the IPC fails. Don't stop polling yet either — if cancel
      // fails the poll loop still needs to surface the job's real
      // status (it may finish, error, or hang).
      const priorGenStatus = useGenerationStore.getState().status;
      const priorFooterStatus = useAppStore.getState().footerStatus;
      useGenerationStore.getState().setStatus("cancelled");
      useAppStore.getState().setFooterStatus("ready");
      try {
        await studioClient.cancelGeneration(jobId);
        stopPolling();
      } catch (err) {
        useGenerationStore.getState().setStatus(priorGenStatus);
        useAppStore.getState().setFooterStatus(priorFooterStatus);
        throw err;
      }
    },
    [stopPolling],
  );

  return { startPolling, stopPolling, cancelJob };
}
