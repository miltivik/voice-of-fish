import type { ModelManifestEntry, VoicePreset } from "@voice-of-fish/shared";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSelect } from "@/components/ui/LanguageSelect";

interface EditorScriptCardProps {
  script: string;
  onScriptChange: (next: string) => void;
  installedModels: ModelManifestEntry[];
  voicePresets: VoicePreset[];
  modelId: string;
  onModelIdChange: (next: string) => void;
  voicePresetId: string;
  onVoicePresetIdChange: (next: string) => void;
  language: string;
  onLanguageChange: (next: string) => void;
  sentenceCount: number;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function EditorScriptCard({
  script,
  onScriptChange,
  installedModels,
  voicePresets,
  modelId,
  onModelIdChange,
  voicePresetId,
  onVoicePresetIdChange,
  language,
  onLanguageChange,
  sentenceCount,
  isGenerating,
  onGenerate,
}: EditorScriptCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Script</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <textarea
          aria-label="Script text"
          value={script}
          onChange={(e) => onScriptChange(e.target.value)}
          rows={8}
          placeholder={`Welcome to the show. Today we explore artificial intelligence. But first, a word from our sponsor.`}
          className="flex min-h-[160px] w-full rounded-brutal border border-glass-border bg-concrete-800 px-3 py-2 text-sm text-concrete-50 shadow-sm transition-colors placeholder:text-concrete-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-concrete"
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="editor-model"
              className="text-xs font-medium text-concrete-300"
            >
              Model
            </label>
            <select
              id="editor-model"
              value={modelId}
              onChange={(e) => onModelIdChange(e.target.value)}
              className="h-8 rounded-brutal border border-glass-border bg-concrete-800 px-2 text-xs text-concrete-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-electric"
            >
              {installedModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.quant}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="editor-voice"
              className="text-xs font-medium text-concrete-300"
            >
              Voice
            </label>
            <select
              id="editor-voice"
              value={voicePresetId}
              onChange={(e) => onVoicePresetIdChange(e.target.value)}
              className="h-8 rounded-brutal border border-glass-border bg-concrete-800 px-2 text-xs text-concrete-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-electric"
            >
              <option value="">None</option>
              {voicePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="editor-language"
              className="text-xs font-medium text-concrete-300"
            >
              Language
            </label>
            <LanguageSelect
              id="language"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
            />
          </div>

          <Button
            onClick={onGenerate}
            disabled={isGenerating || script.trim().length === 0}
          >
            {isGenerating
              ? `Generating ${sentenceCount} sentence(s)…`
              : `Generate ${sentenceCount} sentence(s)`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
