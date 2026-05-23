import { STYLE_TAGS } from "@voice-of-fish/shared/constants";
import { type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { insertTagAtSelection } from "@/lib/tag-editor";

export function StyleTagBar({
  textareaRef,
  getValue,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  getValue: () => string;
  onChange: (value: string) => void;
}) {
  const insert = (tag: string) => {
    const textArea = textareaRef.current;
    const currentValue = getValue();
    const next = insertTagAtSelection(
      currentValue,
      tag,
      textArea?.selectionStart ?? currentValue.length,
      textArea?.selectionEnd ?? currentValue.length,
    );
    onChange(next.text);
    requestAnimationFrame(() => {
      textArea?.focus();
      textArea?.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {STYLE_TAGS.map((tag) => (
        <Button
          key={tag}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => insert(tag)}
        >
          {tag}
        </Button>
      ))}
    </div>
  );
}
