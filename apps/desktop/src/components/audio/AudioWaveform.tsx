import WaveSurfer from "wavesurfer.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function AudioWaveform({
  audioUrl,
  outputPath,
}: {
  audioUrl?: string;
  outputPath?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const waveRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);

  // Create WaveSurfer once, reuse with load() on URL change.
  useEffect(() => {
    if (!host.current) return;
    const wave = WaveSurfer.create({
      container: host.current,
      height: 72,
    });
    waveRef.current = wave;
    wave.on("play", () => setPlaying(true));
    wave.on("pause", () => setPlaying(false));
    wave.on("finish", () => setPlaying(false));
    return () => wave.destroy();
  }, []);

  useEffect(() => {
    if (!audioUrl || !waveRef.current) return;
    waveRef.current.load(audioUrl);
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    waveRef.current?.playPause();
  }, []);

  if (!audioUrl) {
    return (
      <p className="text-sm text-concrete-300">
        WAV path ready after engine integration: {outputPath}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={host} />
      <Button size="sm" variant="ghost" onClick={togglePlay}>
        {playing ? "Pause" : "Play"}
      </Button>
    </div>
  );
}
