/**
 * Turn gram amounts into shopper-friendly labels for a weekly list.
 */
export function formatQuantityLabel(foodName: string, grams: number): string {
  const g = Math.round(grams);
  const lower = foodName.toLowerCase();

  if (lower.includes("egg")) {
    const count = Math.max(1, Math.round(g / 50));
    return `${count} eggs (~${g} g)`;
  }

  if (lower.includes("oil")) {
    return `~${g} ml (oil)`;
  }

  if (lower.includes("milk")) {
    const liters = g / 1030;
    if (liters >= 0.5) {
      return `~${liters.toFixed(1)} L`;
    }
    return `~${g} g`;
  }

  if (g >= 1000) {
    return `${(g / 1000).toFixed(2)} kg`;
  }

  return `${g} g`;
}
