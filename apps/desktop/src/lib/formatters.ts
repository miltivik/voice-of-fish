export function formatDuration(seconds?: number) {
  if (seconds === undefined) {
    return "--";
  }

  return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
}

export function formatByteSize(bytes: number) {
  const gigabytes = bytes / 1_000_000_000;

  return `${gigabytes.toFixed(1)} GB`;
}
