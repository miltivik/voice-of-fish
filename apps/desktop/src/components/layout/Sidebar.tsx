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
import { t } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

const routes: { labelKey: MessageKey; to: string; icon: typeof Gauge }[] = [
  { labelKey: "dashboard", to: "/", icon: Gauge },
  { labelKey: "generate", to: "/generate", icon: Waves },
  { labelKey: "voices", to: "/voices", icon: Mic2 },
  { labelKey: "models", to: "/models", icon: SlidersHorizontal },
  { labelKey: "editorHeading", to: "/editor", icon: Clapperboard },
  { labelKey: "history", to: "/history", icon: History },
  { labelKey: "settings", to: "/settings", icon: Settings },
  { labelKey: "diagnostics", to: "/diagnostics", icon: Activity },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r-2 border-glass-border-strong bg-glass-heavy backdrop-blur-glass">
      <div className="border-b-2 border-glass-border-strong px-5 py-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-concrete-300">
          {t("appName")}
        </p>
        <p className="mt-1 font-mono text-sm font-semibold text-concrete-50">
          STUDIO_WORKBENCH
        </p>
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 p-3">
        {routes.map(({ labelKey, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex h-10 items-center gap-3 rounded-brutal px-3 font-mono text-xs font-medium uppercase tracking-wider text-concrete-300 outline-none transition-all hover:bg-glass hover:text-concrete-50 focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-concrete-700",
                isActive &&
                  "bg-electric/10 text-electric border-l-2 border-electric",
              )
            }
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            <span>{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
