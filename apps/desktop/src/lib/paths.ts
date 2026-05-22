export function basename(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

export function quotePath(path: string) {
  return path.includes(" ") ? `"${path}"` : path;
}
