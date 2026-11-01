/**
 * Ramp steps from palette.html: 0 is everyone busy, 4 is everyone free.
 * Kept next to the input grid so ticket 11 can switch it on without moving
 * the code again.
 */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Share of free people among the confirmed ones: 0% is busy, 100% is its own
 * step, everything between splits into three bands.
 */
export function levelForShare(share: number): HeatLevel {
  if (share === 0) return 0;
  if (share <= 1 / 3) return 1;
  if (share <= 2 / 3) return 2;
  if (share < 1) return 3;
  return 4;
}
