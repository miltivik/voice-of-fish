import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { defaultConfig } from "@/lib/mock-data";
import { useAppStore } from "@/stores/useAppStore";

export function SettingsPage() {
  const config = useAppStore((state) => state.config) ?? defaultConfig;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
        <p className="mt-1 text-sm text-muted">Local app configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paths</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <span className="font-medium text-studio-foreground">Binary: </span>
            <span className="text-muted">
              {config.binaryPath || "Not configured"}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-studio-foreground">Models: </span>
            <span className="text-muted">{config.modelsPath}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-studio-foreground">
              Outputs:{" "}
            </span>
            <span className="text-muted">{config.outputsPath}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engine defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <span className="font-medium text-studio-foreground">Model: </span>
            <span className="text-muted">{config.defaultModelId}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-studio-foreground">Format: </span>
            <span className="text-muted">{config.defaultAudioFormat}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-studio-foreground">
              CPU threads:{" "}
            </span>
            <span className="text-muted">{config.cpuThreads}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-studio-foreground">GPU: </span>
            <span className="text-muted">
              {config.gpuEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          {config.mode === "advanced" && (
            <div className="space-y-1 pt-2">
              <label
                htmlFor="advanced-args"
                className="text-sm font-medium text-studio-foreground"
              >
                Advanced engine arguments
              </label>
              <Input
                id="advanced-args"
                disabled
                aria-label="Advanced engine arguments"
                defaultValue={JSON.stringify(config.advancedArgs)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
