import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, type ReactNode } from "react";
import { HashRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { studioClient } from "@/lib/tauri";
interface AppProvidersProps {
  children: ReactNode;
}
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 2 },
        },
      }),
  );
  // Seed built-in voices on first launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (cancelled) return;
        const results = await studioClient.seedBuiltInVoices();
        if (cancelled || !results) return;
        const downloaded = results.filter((r) => r.success && !r.error).length;
        const skipped = results.filter((r) => r.success && r.error).length;
        if (downloaded > 0) {
          console.log(
            `[built-in voices] seeded ${downloaded} voices, ${skipped} already existed`,
          );
          // Invalidate voice-presets query so the selector refreshes.
          queryClient.invalidateQueries({ queryKey: ["voice-presets"] });
        }
      } catch (e) {
        // Non-fatal: seeding failure should not block the app.
        console.warn("[built-in voices] seeding failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        {children}
        <Toaster
          closeButton
          richColors
          theme="dark"
          toastOptions={{
            classNames: {
              toast: "border-glass-border bg-glass text-concrete-50",
            },
          }}
        />
      </HashRouter>
    </QueryClientProvider>
  );
}
