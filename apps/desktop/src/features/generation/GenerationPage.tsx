import type { GenerationJob } from "@voice-of-fish/shared";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GenerationResult } from "@/components/generation/GenerationResult";
import { RecentGenerations } from "@/components/generation/RecentGenerations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { studioClient } from "@/lib/tauri";
import { GenerationForm } from "./GenerationForm";

export function GenerationPage() {
  const [completedJob, setCompletedJob] = useState<GenerationJob | null>(null);

  const models = useQuery({
    queryKey: ["models"],
    queryFn: studioClient.listLocalModels,
  });
  const installedModels = (models.data ?? []).filter(
    (m) => m.state === "installed",
  );

  const history = useQuery({
    queryKey: ["history"],
    queryFn: () => studioClient.listGenerationHistory(),
  });

  const presets = useQuery({
    queryKey: ["voice-presets"],
    queryFn: studioClient.listVoicePresets,
    staleTime: 30_000,
  });

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Generate</h1>
        <p className="mt-1 text-sm text-concrete-300">
          Compose script text, add style tags, and generate audio.
        </p>
      </div>

      <GenerationForm
        installedModels={installedModels}
        presets={presets.data ?? []}
        onJobComplete={setCompletedJob}
      />

      {completedJob && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <GenerationResult job={completedJob} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent generations</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentGenerations
            history={history.data ?? []}
            completedJob={completedJob}
          />
        </CardContent>
      </Card>
    </section>
  );
}
