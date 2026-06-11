import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { getRuntimePlatform } from "@/lib/platform";

const isMac = getRuntimePlatform() === "macos";

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = isMac ? e.metaKey : e.ctrlKey;

      // Escape → cancel active generation
      if (e.key === "Escape") {
        const { activeJobId } = useAppStore.getState();
        if (activeJobId) {
          e.preventDefault();
          useAppStore.getState().cancelGeneration();
        }
        return;
      }

      // Ctrl/Cmd+Enter → submit generation form (only if not already generating)
      if (mod && e.key === "Enter") {
        const { activeJobId } = useAppStore.getState();
        if (activeJobId) return;
        const form = document.querySelector<HTMLFormElement>(
          "#generation-form",
        );
        if (form) {
          e.preventDefault();
          form.requestSubmit();
        }
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
