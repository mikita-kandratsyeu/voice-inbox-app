export function formatElapsedLabelWorklet(ms: number) {
  'worklet';
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
}
