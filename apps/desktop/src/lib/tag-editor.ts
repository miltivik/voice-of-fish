import { STYLE_TAGS } from "@voice-of-fish/shared/constants";

const ALL_TAGS = [...STYLE_TAGS];

export function insertTagAtSelection(
  text: string,
  tag: string,
  start: number,
  end: number,
) {
  const nextText = `${text.slice(0, start)}${tag}${text.slice(end)}`;
  const nextCursor = start + tag.length;

  return {
    text: nextText,
    selectionStart: nextCursor,
    selectionEnd: nextCursor,
  };
}

/** Find an unclosed `[...` ending at cursor position. Returns the query
 *  text (without `[`) or null if no active bracket. */
export function getActiveQuery(
  text: string,
  cursor: number,
): string | null {
  const beforeCursor = text.slice(0, cursor);
  const lastOpen = beforeCursor.lastIndexOf("[");
  if (lastOpen === -1) return null;
  if (beforeCursor.slice(lastOpen).includes("]")) return null;
  return beforeCursor.slice(lastOpen + 1);
}

export function filterTags(query: string): string[] {
  if (!query) return ALL_TAGS;
  const lower = query.toLowerCase();
  return ALL_TAGS.filter((tag) => tag.toLowerCase().includes(lower));
}
