import { Types } from 'mongoose';
import { setupTestDb, teardownTestDb, clearTestDb } from '../utils/db';
import { computePricing } from '../../src/modules/common/pricing.util';
import { platformConfigService } from '../../src/modules/common/platform-config.service';

describe('computePricing (unit, DB-backed config)', () => {
  beforeAll(setupTestDb);
  afterAll(teardownTestDb);
  afterEach(clearTestDb);

  it('applies the default delivery charge + tax percent from platform config', async () => {
    const pricing = await computePricing(100000, 0);
    const config = await platformConfigService.getConfig();

    expect(pricing.itemsTotal).toBe(100000);
    expect(pricing.deliveryCharge).toBe(config.deliveryChargeMinor);
    expect(pricing.taxes).toBe(Math.round((100000 * config.taxPercent) / 100));
    expect(pricing.grandTotal).toBe(pricing.itemsTotal + pricing.deliveryCharge + pricing.taxes);
  });

  it('never charges delivery for an empty cart', async () => {
    const pricing = await computePricing(0, 0);
    expect(pricing.deliveryCharge).toBe(0);
  });

  it('subtracts discount before computing tax, floors taxable amount at zero', async () => {
    const pricing = await computePricing(1000, 5000);
    expect(pricing.taxes).toBe(0);
  });

  it('reflects an admin config update on the next call', async () => {
    await platformConfigService.updateConfig(new Types.ObjectId().toString(), { deliveryChargeMinor: 9999 });
    const pricing = await computePricing(100000, 0);
    expect(pricing.deliveryCharge).toBe(9999);
  });
});
