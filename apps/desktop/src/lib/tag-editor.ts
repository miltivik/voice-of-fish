export function insertTagAtSelection(text: string, tag: string, start: number, end: number) {
  const nextText = `${text.slice(0, start)}${tag}${text.slice(end)}`;
  const nextCursor = start + tag.length;

  return {
    text: nextText,
    selectionStart: nextCursor,
    selectionEnd: nextCursor,
  };
}
