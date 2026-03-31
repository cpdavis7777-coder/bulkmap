/** Internal optimizer profile always uses kg + cm. */

export type UnitSystem = "metric" | "imperial";

export function lbToKg(lb: number): number {
  return lb * 0.45359237;
}

export function kgToLb(kg: number): number {
  return kg / 0.45359237;
}

/** Total inches from feet + fractional inches (e.g. ft=5, inches=11 → 71 in). */
export function ftInToTotalInches(feet: number, inches: number): number {
  return Math.max(0, feet) * 12 + Math.max(0, inches);
}

export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

export function cmToInches(cm: number): number {
  return cm / 2.54;
}

export function formatHeightImperial(cm: number): string {
  const totalIn = cmToInches(cm);
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return `${ft}'${inch}"`;
}
