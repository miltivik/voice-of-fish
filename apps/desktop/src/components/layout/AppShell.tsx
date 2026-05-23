import { Outlet } from "react-router-dom";
import { EngineHeader } from "./EngineHeader";
import { Sidebar } from "./Sidebar";
import { StatusFooter } from "./StatusFooter";

export function AppShell() {
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
