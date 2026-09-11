/**
 * Formats time in seconds to mm:ss.SS (e.g. 01:23.45)
 */
export function formatTime(seconds: number, includeHours = false): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 100);

  const pad = (num: number, size = 2) => String(num).padStart(size, '0');

  if (includeHours || hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(millis)}`;
  }
  return `${pad(mins)}:${pad(secs)}.${pad(millis)}`;
}

/**
 * Formats time in seconds to mm:ss (e.g. 01:23)
 */
export function formatTimeShort(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Formats seconds to SRT timestamp: 00:01:23,450
 */
export function formatSrtTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad = (num: number, size = 2) => String(num).padStart(size, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * Formats seconds to WebVTT timestamp: 00:01:23.450
 */
export function formatVttTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const pad = (num: number, size = 2) => String(num).padStart(size, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
}

/**
 * Parses timestamp string (00:01:23.450 or 00:01:23,450 or 01:23.45 or seconds number) to seconds
 */
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const trimmed = timeStr.trim().replace(',', '.');
  
  // Direct float/int check
  if (!trimmed.includes(':')) {
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? 0 : parsed;
  }

  const parts = trimmed.split(':');
  if (parts.length === 3) {
    const hrs = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    const secs = parseFloat(parts[2]) || 0;
    return hrs * 3600 + mins * 60 + secs;
  } else if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  return 0;
}
