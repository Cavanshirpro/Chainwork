// Subtle tactile vibration feedback for touch devices using navigator.vibrate.

function pulse(pattern: number | number[]): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

export const haptics = {
  /** Short crisp tap when placing or carrying a letter tile */
  vibrateTilePlace(): boolean {
    return pulse(10);
  },

  /** Satisfying double-pulse when a rung locks or chain completes */
  vibrateRungSolved(): boolean {
    return pulse([18, 35, 28]);
  },

  /** Distinctive warning pulse on invalid word, broken link, or disallowed tile */
  vibrateError(): boolean {
    return pulse([35, 30, 35]);
  },
};
