import { Outlet } from "react-router-dom";
import { SetupPanel } from "@/components/settings/SetupPanel";
import { useAppStore } from "@/stores/useAppStore";
import { EngineHeader } from "./EngineHeader";
import { Sidebar } from "./Sidebar";
import { StatusFooter } from "./StatusFooter";

export function AppShell() {
  const setupComplete = useAppStore((state) => state.setupComplete);
  const saveConfig = useAppStore((state) => state.saveConfig);

  return (
    <div className="min-h-screen min-w-[1024px] bg-studio text-studio-foreground">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-col pl-64">
        <EngineHeader />
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
          {setupComplete ? <Outlet /> : <SetupPanel onSave={saveConfig} />}
        </main>
        <StatusFooter />
      </div>
    </div>
  );
}
