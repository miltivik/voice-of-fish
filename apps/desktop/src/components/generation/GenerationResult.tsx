import type { GenerationJob } from "@voice-of-fish/shared";
import { AudioWaveform } from "@/components/audio/AudioWaveform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { studioClient } from "@/lib/tauri";

export function GenerationResult({ job }: { job: GenerationJob }) {
  const handleExport = () => {
    if (!job.outputPath) return;
    studioClient.openOutputFile(job.outputPath).catch((err) => {
      console.error("[GenerationResult] openOutputFile failed:", err);
    });
  };

  return (
    <div className="space-y-3">
      <Badge variant="default">Generation completed</Badge>
      <p className="text-sm text-concrete-50">
        Output: {job.outputPath ?? "Pending"}
      </p>
      {job.durationSeconds != null && (
        <p className="text-xs text-concrete-300">Duration: {job.durationSeconds}s</p>
      )}
      <AudioWaveform audioUrl={job.audioUrl} outputPath={job.outputPath} />
      <Button disabled={!job.outputPath} onClick={handleExport}>
        Export WAV
      </Button>
    </div>
  );
}
