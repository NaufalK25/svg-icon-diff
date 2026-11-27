export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

export function estimateGzipSize(content: string): number {
  // Simple estimation: gzip typically reduces by 60-80% for text
  // This is a rough heuristic without actual gzip compression
  const byteLength = new Blob([content]).size;
  return Math.round(byteLength * 0.35); // Assume ~65% compression for text
}

export function formatContentSize(content: string): string {
  return formatBytes(new Blob([content]).size);
}

export function formatFilesize(bytes: number): string {
  return formatBytes(bytes);
}
