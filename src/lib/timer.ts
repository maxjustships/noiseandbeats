const TIMER_DURATIONS = [15, 25, 45, 60].map((minutes) => minutes * 60);

export function nextTimerDuration(current: number | null): number | null {
  if (current === null) return TIMER_DURATIONS[0];

  const next = TIMER_DURATIONS.find((duration) => current <= duration && duration !== current);
  return next ?? null;
}

export function tickTimer(current: number | null, playing: boolean): number | null {
  if (!playing || current === null) return current;
  return Math.max(0, current - 1);
}
