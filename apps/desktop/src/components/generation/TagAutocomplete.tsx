import { useState, useEffect, useCallback, useRef } from "react";
import {
  insertTagAtSelection,
  getActiveQuery,
  filterTags,
} from "@/lib/tag-editor";

interface TagAutocompleteProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  getValue: () => string;
  onChange: (value: string) => void;
}

export function TagAutocomplete({
  textareaRef,
  getValue,
  onChange,
}: TagAutocompleteProps) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tags = filterTags(query);

  const checkTrigger = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const text = getValue();
    const cursor = ta.selectionStart;
    const activeQuery = getActiveQuery(text, cursor);
    if (activeQuery !== null) {
      setQuery(activeQuery);
      setSelectedIndex(0);
      setVisible(true);
      const rect = ta.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    } else {
      setVisible(false);
    }
  }, [textareaRef, getValue]);

  // Listen for input / keyup / click on the textarea.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const handler = () => checkTrigger();
    ta.addEventListener("input", handler);
    ta.addEventListener("keyup", handler);
    ta.addEventListener("click", handler);
    return () => {
      ta.removeEventListener("input", handler);
      ta.removeEventListener("keyup", handler);
      ta.removeEventListener("click", handler);
    };
  }, [textareaRef, checkTrigger]);

  // Close on outside click.
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setVisible(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]);

  const insertTag = useCallback(
    (tag: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const text = getValue();
      const cursor = ta.selectionStart;
      const beforeCursor = text.slice(0, cursor);
      const lastOpen = beforeCursor.lastIndexOf("[");
      if (lastOpen === -1) return;
      const nextText =
        text.slice(0, lastOpen) + tag + text.slice(cursor);
      const nextCursor = lastOpen + tag.length;
      onChange(nextText);
      setVisible(false);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [textareaRef, getValue, onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % tags.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) =>
          (i - 1 + tags.length) % tags.length,
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (tags[selectedIndex]) {
          insertTag(tags[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setVisible(false);
      }
    },
    [visible, tags, selectedIndex, insertTag],
  );

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.addEventListener("keydown", handleKeyDown);
    return () => ta.removeEventListener("keydown", handleKeyDown);
  }, [textareaRef, handleKeyDown]);

  // Scroll selected item into view.
  useEffect(() => {
    if (!dropdownRef.current) return;
    const selected =
      dropdownRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!visible || tags.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 max-h-52 w-72 overflow-y-auto rounded-brutal border border-glass-border bg-concrete-800 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-concrete-400">
        Style tags
      </div>
      {tags.map((tag, i) => (
        <button
          key={tag}
          type="button"
          className={`block w-full px-3 py-1.5 text-left text-sm transition-colors ${
            i === selectedIndex
              ? "bg-electric/20 text-electric"
              : "text-concrete-50 hover:bg-concrete-700"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            insertTag(tag);
          }}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
