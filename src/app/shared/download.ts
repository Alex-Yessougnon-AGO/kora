import { toDateInputValue } from '../core/dates';

/** Déclenche un téléchargement local, sans backend. */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function datedFilename(prefix: string, extension = 'csv'): string {
  return `${prefix}-${toDateInputValue(new Date())}.${extension}`;
}
