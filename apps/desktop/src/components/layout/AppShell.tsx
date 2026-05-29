import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { studioClient } from "@/lib/tauri";
import { Outlet } from "react-router-dom";
import { SetupPanel } from "@/components/settings/SetupPanel";
import { useAppStore } from "@/stores/useAppStore";
import { EngineHeader } from "./EngineHeader";
import { Sidebar } from "./Sidebar";
import { StatusFooter } from "./StatusFooter";

export function AppShell() {
  const setupComplete = useAppStore((state) => state.setupComplete);
  const saveConfig = useAppStore((state) => state.saveConfig);
  const hydrateConfig = useAppStore((state) => state.hydrateConfig);

  // Load persisted config on mount (hydrate, not save, to avoid infinite loop)
  const { data: persistedConfig } = useQuery({
    queryKey: ["app-config"],
    queryFn: () => studioClient.getAppConfig(),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (persistedConfig) {
      hydrateConfig(persistedConfig);
    }
  }, [persistedConfig, hydrateConfig]);

  if (!setupComplete) {
    return (
      <div className="min-h-screen bg-studio text-studio-foreground">
        <SetupPanel onSave={saveConfig} />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-[1024px] bg-studio text-studio-foreground">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-col pl-64">
        <EngineHeader />
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          <Outlet />
        </main>
        <StatusFooter />
      </div>
    </div>
  );
}