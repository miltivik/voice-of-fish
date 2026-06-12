import type { VoicePreset } from "@voice-of-fish/shared";
import { t } from "@/lib/i18n";

interface VoicePresetSelectorProps {
  presets: VoicePreset[];
  selectedPresetId: string;
  onSelectPreset: (id: string) => void;
}

export function VoicePresetSelector({
  presets,
  selectedPresetId,
  onSelectPreset,
}: VoicePresetSelectorProps) {
  const builtIn = presets.filter((p) => p.id.startsWith("built-in-"));
  const custom = presets.filter((p) => !p.id.startsWith("built-in-"));
  const groups: { label: string; items: VoicePreset[] }[] = [];
  if (builtIn.length > 0) {
    const byLang = new Map<string, VoicePreset[]>();
    for (const p of builtIn) {
      const lang = p.language ?? "other";
      if (!byLang.has(lang)) byLang.set(lang, []);
      const list = byLang.get(lang);
      if (list) list.push(p);
    }
    for (const [lang, items] of byLang) {
      groups.push({
        label: `Built-in — ${lang.toUpperCase()}`,
        items,
      });
    }
  }
  if (custom.length > 0) {
    groups.push({ label: "Custom", items: custom });
  }

  return (
    <div className="space-y-1">
      <label htmlFor="voice" className="text-sm font-medium text-concrete-50">
        {t("voicePresetOptional")}
      </label>
      <select
        id="voice"
        value={selectedPresetId}
        onChange={(e) => onSelectPreset(e.target.value)}
        className="flex h-9 w-full rounded-brutal border border-glass-border bg-concrete-800 px-3 py-1 text-sm text-concrete-50 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-concrete"
      >
        <option value="">{t("genericNone")}</option>
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.items.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
                {preset.gender ? ` (${preset.gender})` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
