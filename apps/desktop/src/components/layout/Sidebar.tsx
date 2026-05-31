import {
  Activity,
  Clapperboard,
  Gauge,
  History,
  Mic2,
  Settings,
  SlidersHorizontal,
  Waves,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const routes = [
  { label: "Dashboard", to: "/", icon: Gauge },
  { label: "Generate", to: "/generate", icon: Waves },
  { label: "Voices", to: "/voices", icon: Mic2 },
  { label: "Models", to: "/models", icon: SlidersHorizontal },
  { label: "Editor", to: "/editor", icon: Clapperboard },
  { label: "History", to: "/history", icon: History },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Diagnostics", to: "/diagnostics", icon: Activity },
];
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r border-line bg-panel">
      <div className="border-b border-line px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Voice of Fish
        </p>
        <p className="mt-1 text-sm font-semibold text-studio-foreground">
          Studio Workbench
        </p>
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 p-3">
        {routes.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted outline-none transition-colors hover:bg-line/50 hover:text-studio-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel",
                isActive && "bg-line text-studio-foreground",
              )
            }
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
