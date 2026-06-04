import { LANGUAGE_OPTIONS } from "@voice-of-fish/shared/constants";
import type { UseFormRegisterReturn } from "react-hook-form";
interface LanguageSelectProps {
  id?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  register?: UseFormRegisterReturn;
  className?: string;
}

const baseClass =
  "flex h-9 w-full rounded-brutal border border-glass-border bg-concrete-800 px-3 py-1 text-sm text-concrete-50 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-concrete";

export function LanguageSelect({ id, value, onChange, register, className }: LanguageSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      {...register}
      className={className ?? baseClass}
    >
      {LANGUAGE_OPTIONS.map((lang) => (
        <option key={lang.value} value={lang.value}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
