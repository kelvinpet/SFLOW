/**
 * Dedicated Web Worker for pacing and frame timing during video export
 * Prevents main-thread UI lag and browser tab throttling from stalling video encoding
 */

let timerId: number | null = null;

self.onmessage = (e: MessageEvent) => {
  const { command, fps = 30 } = e.data || {};

  if (command === 'start') {
    if (timerId !== null) {
      clearInterval(timerId);
    }
    const intervalMs = 1000 / fps;
    timerId = self.setInterval(() => {
      self.postMessage({ type: 'tick', timestamp: performance.now() });
    }, intervalMs);
  } else if (command === 'stop') {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    self.postMessage({ type: 'stopped' });
  }
};
