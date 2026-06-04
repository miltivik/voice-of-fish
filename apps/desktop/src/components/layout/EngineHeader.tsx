import { Cpu, Monitor, RadioTower } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { S2_MODEL_MANIFEST } from "@voice-of-fish/shared/constants";
import { Badge } from "@/components/ui/badge";
import { useModelStore } from "@/stores/useModelStore";
import { studioClient } from "@/lib/tauri";
import { getRuntimePlatformLabel } from "@/lib/platform";

export function EngineHeader() {
  const activeModelId = useModelStore((state) => state.activeModelId);
  const activeModel = S2_MODEL_MANIFEST.find(
    (model) => model.id === activeModelId,
  );

  const { data: systemInfo } = useQuery({
    queryKey: ["system-info"],
    queryFn: studioClient.getSystemInfo,
    staleTime: Infinity,
  });

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b-2 border-glass-border-strong bg-glass-heavy/95 px-6 backdrop-blur-glass">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-concrete-300">
          Engine status
        </p>
        <div className="mt-1 flex items-center gap-2 font-mono text-sm text-concrete-50">
          <RadioTower aria-hidden="true" className="h-4 w-4 text-electric" />
          <span>Engine idle</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="secondary">
          <Monitor aria-hidden="true" className="mr-1 h-3 w-3" />
          {systemInfo?.os ?? getRuntimePlatformLabel()}
        </Badge>
        <Badge>
          <Cpu aria-hidden="true" className="mr-1 h-3 w-3" />
          {activeModel
            ? `${activeModel.id.toUpperCase()} ${activeModel.quant}`
            : activeModelId}
        </Badge>
      </div>
    </header>
  );
}
