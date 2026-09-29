import { platformConfigService } from './platform-config.service';

export interface PricingBreakdown {
  itemsTotal: number;
  deliveryCharge: number;
  taxes: number;
  discount: number;
  grandTotal: number;
}

// Reads live Admin-configurable config (Phase 9) instead of the old env.ts placeholders.
export async function computePricing(itemsTotal: number, discount: number): Promise<PricingBreakdown> {
  const config = await platformConfigService.getConfig();
  const deliveryCharge = itemsTotal > 0 ? config.deliveryChargeMinor : 0;
  const taxableAmount = Math.max(itemsTotal - discount, 0);
  const taxes = Math.round((taxableAmount * config.taxPercent) / 100);
  const grandTotal = taxableAmount + deliveryCharge + taxes;
  return { itemsTotal, deliveryCharge, taxes, discount, grandTotal };
}
