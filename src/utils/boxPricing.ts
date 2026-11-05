/**
 * Corrugated box pricing model.
 *
 * Formula (industry cost structure):
 *   blank area S (m²) = [ 2 × (L + W) + joint ] × ( W + H ) ÷ 1,000,000
 *   board rate R(g)   = ratePerM2 × ( grammage / referenceGrammage )
 *   material M(g)     = S ÷ yieldRate × R(g)
 *   unit price P(g,t) = ( M(g) + processPerPiece ) × (1 + marginRate) × tierFactor
 *
 * Shared by the build-time render (server side) and the browser re-compute when the
 * visitor switches grammage, so both always agree.
 */

export interface PricingParams {
  /** Joint / glue flap allowance in mm (industry 35–40 mm). */
  jointMm: number;
  /** Board yield rate, i.e. usable area ÷ raw sheet area (industry 0.75–0.92). */
  yieldRate: number;
  /** Per-piece converting cost: die-cut + printing + gluing. */
  processPerPiece: number;
  /** Profit + overhead margin, e.g. 0.12. */
  marginRate: number;
  /** Grammage the stored ratePerM2 values are quoted at. */
  referenceGrammage: number;
}

export interface PriceArgs {
  areaM2: number;
  ratePerM2: number;
  grammage: number;
  tierFactor: number;
  params: PricingParams;
}

/** Unfolded blank area of an RSC box in m²; dimensions in mm. */
export function blankAreaM2(dims: [number, number, number] | number[], jointMm: number): number {
  const [l, w, h] = dims;
  return ((2 * (l + w) + jointMm) * (w + h)) / 1_000_000;
}

/** Unit price for one box at the given grammage and quantity tier. */
export function pricePerPiece({
  areaM2,
  ratePerM2,
  grammage,
  tierFactor,
  params,
}: PriceArgs): number {
  const grammageRatio = grammage / params.referenceGrammage;
  const material = (areaM2 / params.yieldRate) * ratePerM2 * grammageRatio;
  return (material + params.processPerPiece) * (1 + params.marginRate) * tierFactor;
}

/** Consistent two-decimal display, used by both server render and client re-compute. */
export function formatPrice(value: number, currency: string): string {
  return `${currency} ${value.toFixed(2)}`;
}
