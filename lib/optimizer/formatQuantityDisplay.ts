import { formatQuantityLabel } from "@/lib/optimizer/formatQuantity";
import type { UnitSystem } from "@/lib/units/measurement";

const LB_PER_KG = 2.2046226218;

/** Shopper-friendly quantity string respecting unit system (labels are approximate). */
export function formatQuantityForDisplay(foodName: string, grams: number, units: UnitSystem = "metric"): string {
  if (units === "metric") {
    return formatQuantityLabel(foodName, grams);
  }

  const g = Math.round(grams);
  const lower = foodName.toLowerCase();

  if (lower.includes("egg")) {
    const count = Math.max(1, Math.round(g / 50));
    return `${count} eggs (~${(g / LB_PER_KG).toFixed(1)} oz)`;
  }

  if (lower.includes("oil")) {
    const flOz = g * 0.033814;
    return `~${flOz.toFixed(1)} fl oz oil`;
  }

  if (lower.includes("milk")) {
    const gal = g / 3785.41;
    if (gal >= 0.25) {
      return `~${gal.toFixed(2)} gal`;
    }
    const cups = g / 244;
    return `~${cups.toFixed(1)} cups (~${(g / LB_PER_KG).toFixed(2)} lb)`;
  }

  const lb = g / 453.592;
  if (lb >= 1) {
    return `${lb.toFixed(2)} lb`;
  }
  return `${(g / LB_PER_KG).toFixed(1)} oz`;
}
