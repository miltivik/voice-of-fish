import WaveSurfer from "wavesurfer.js";
import { useEffect, useRef } from "react";

export function AudioWaveform({
  audioUrl,
  outputPath,
}: {
  audioUrl?: string;
  outputPath?: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!audioUrl || !host.current) return;
    const wave = WaveSurfer.create({
      container: host.current,
      url: audioUrl,
      height: 72,
    });
    return () => wave.destroy();
  }, [audioUrl]);

  return audioUrl ? (
    <div ref={host} />
  ) : (
    <p className="text-sm text-muted">
      WAV path ready after engine integration: {outputPath}
    </p>
  );
}
