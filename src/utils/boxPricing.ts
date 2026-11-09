/**
 * Corrugated box pricing model — two quote modes.
 *
 * Common cost build-up:
 *   ① boardPricePerM2(CNY) = liners × linerPrice + Σ mediumPrice[flute] + boardProcessing + smallOrderSurcharge
 *   ② material(€)          = ① × cnyToEur × (blankArea ÷ yieldRate)
 *   ③ production(€)        = ② × otherCostFactor            (labour / wear / rent / utilities)
 *   ④ freightPerBox(€)     = containerCostUsd × eurPerUsd ÷ boxesPerContainer
 *   ⑤ blankArea(m²)        = [2(L+W) + joint] × (W+H) ÷ 1e6
 *   ⑥ boxesPerContainer    = floor(containerVolume × fillRate ÷ (blankArea × boardThickness))
 *
 * Mode "delivered" (default): price = (③ + ④ + customs) ÷ (1 − agentFee − 25% margin)
 * Mode "exw"      (own forwarder): price = ③ ÷ (1 − 30% margin)   — no freight / customs / agent fee
 *
 * Shared by the server render (build) and the browser re-compute (mode / material switch).
 */

export type PricingMode = 'delivered' | 'exw';

export interface ModeConfig {
  freight: boolean;
  customs: boolean;
  agentFee: boolean;
  margin: number;
}

export interface ContainerConfig {
  costUsd: number;
  volumeM3: number;
  fillRate: number;
}

export interface SmallOrderConfig {
  under150: Record<string, number>;
  under300: Record<string, number>;
}

export interface PricingParams {
  jointMm: number;
  yieldRate: number;
  otherCostFactor: number;
  cnyToEur: number;
  eurPerUsd: number;
  container: ContainerConfig;
  customsPerBox: number;
  agentFeeRate: number;
  boardThicknessMm: Record<string, number>;
  modes: Record<PricingMode, ModeConfig>;
}

export interface PriceArgs {
  /** Box outer dimensions in mm: [L, W, H]. */
  dims: number[];
  /** Flute combination, e.g. "BC", "E". */
  typeCode: string;
  /** Layer count key used by boardProcessing / thickness lookup: "3" | "5" | "7". */
  layerCount: string;
  linerPrice: number;
  mediumPrices: Record<string, number>;
  processing: number;
  smallOrder: SmallOrderConfig;
  /** Representative quantity for the tier — drives the small-order surcharge. */
  qty: number;
  mode: PricingMode;
  params: PricingParams;
}

/** Unfolded blank area of an RSC box in m²; dimensions in mm. */
export function blankAreaM2(dims: number[], jointMm: number): number {
  const [l, w, h] = dims;
  return ((2 * (l + w) + jointMm) * (w + h)) / 1_000_000;
}

/** Split a flute code such as "BC" into ["B", "C"]. */
export function flutesOf(typeCode: string): string[] {
  return typeCode.split('').filter(Boolean);
}

/** Board price per m² in CNY, including the factory's small-order surcharge. */
export function boardPricePerM2(args: {
  flutes: string[];
  linerPrice: number;
  mediumPrices: Record<string, number>;
  processing: number;
  orderAreaM2: number;
  smallOrder: SmallOrderConfig;
  layerCount: string;
}): number {
  const linerCount = args.flutes.length + 1;
  let total = args.linerPrice * linerCount;

  for (const flute of args.flutes) {
    const price = args.mediumPrices[flute];
    if (price === undefined) {
      throw new Error(`No medium price for flute "${flute}" — check materials.json`);
    }
    total += price;
  }

  total += args.processing;

  const tier = args.orderAreaM2 < 150 ? args.smallOrder.under150 : args.orderAreaM2 < 300 ? args.smallOrder.under300 : null;
  if (tier) total += tier[args.layerCount] ?? 0;

  return total;
}

/** How many flat-packed boxes fit in one container. */
export function boxesPerContainer(areaM2: number, thicknessMm: number, container: ContainerConfig): number {
  const perBoxM3 = areaM2 * (thicknessMm / 1000);
  if (perBoxM3 <= 0) return 0;
  return Math.floor((container.volumeM3 * container.fillRate) / perBoxM3);
}

/** Unit price for one box at the given mode and quantity tier. */
export function pricePerPiece(args: PriceArgs): number {
  const { params } = args;
  const areaM2 = blankAreaM2(args.dims, params.jointMm);
  const orderAreaM2 = args.qty * areaM2;

  const boardRate = boardPricePerM2({
    flutes: flutesOf(args.typeCode),
    linerPrice: args.linerPrice,
    mediumPrices: args.mediumPrices,
    processing: args.processing,
    orderAreaM2,
    smallOrder: args.smallOrder,
    layerCount: args.layerCount,
  });

  const material = boardRate * params.cnyToEur * (areaM2 / params.yieldRate);
  const production = material * params.otherCostFactor;

  const mode = params.modes[args.mode];
  let total = production;

  if (mode.freight) {
    const thickness = params.boardThicknessMm[args.layerCount] ?? 7;
    const boxes = boxesPerContainer(areaM2, thickness, params.container);
    if (boxes > 0) {
      total += (params.container.costUsd * params.eurPerUsd) / boxes;
    }
  }
  if (mode.customs) {
    total += params.customsPerBox;
  }

  const denominator = 1 - (mode.agentFee ? params.agentFeeRate : 0) - mode.margin;
  return total / denominator;
}

/** Consistent two-decimal display, used by both server render and client re-compute. */
export function formatPrice(value: number, currency: string): string {
  return `${currency} ${value.toFixed(2)}`;
}
