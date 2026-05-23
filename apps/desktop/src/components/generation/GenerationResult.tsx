import type { GenerationJob } from "@voice-of-fish/shared";
import { AudioWaveform } from "@/components/audio/AudioWaveform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function GenerationResult({ job }: { job: GenerationJob }) {
  return (
    <div className="space-y-3">
      <Badge variant="default">Generation completed</Badge>
      <p className="text-sm text-studio-foreground">
        Output: {job.outputPath ?? "Pending"}
      </p>
      {job.durationSeconds != null && (
        <p className="text-xs text-muted">
          Duration: {job.durationSeconds}s
        </p>
      )}
      <AudioWaveform audioUrl={job.audioUrl} outputPath={job.outputPath} />
      <Button disabled={!job.outputPath}>Export WAV</Button>
    </div>
  );
}
