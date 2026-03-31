/** Default label shown next to purchase links until retailer-specific builders exist. */
export const DEFAULT_PURCHASE_SOURCE_LABEL = "Google search";

export type PurchaseLink = {
  url: string;
  source_label: string;
};

/**
 * Stable, structured product search — easy to swap for Target/Walmart URL builders later.
 */
export function buildPurchaseLink(foodName: string): PurchaseLink {
  const q = encodeURIComponent(`${foodName} grocery buy online`);
  return {
    url: `https://www.google.com/search?q=${q}`,
    source_label: DEFAULT_PURCHASE_SOURCE_LABEL,
  };
}

/** Backward-compatible: URL only. */
export function buildPurchaseSearchUrl(foodName: string): string {
  return buildPurchaseLink(foodName).url;
}
