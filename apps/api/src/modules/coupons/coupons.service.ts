import { HttpError } from '../common/http-error';
import { OrderModel } from '../orders/order.model';
import { CouponModel, type CouponDocument } from './coupon.model';

export interface CouponEvaluation {
  coupon: CouponDocument & { code: string };
  discount: number;
}

export const couponsService = {
  async listApplicable(restaurantId: string | undefined, itemsTotal: number) {
    const now = new Date();
    const filter: Record<string, unknown> = {
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
      minOrderValue: { $lte: itemsTotal },
    };
    const coupons = await CouponModel.find(filter);
    return coupons.filter(
      (c) => c.applicableRestaurantIds.length === 0 || (restaurantId && c.applicableRestaurantIds.some((id) => id.toString() === restaurantId)),
    );
  },

  async validateAndCompute(code: string, userId: string, restaurantId: string | undefined, itemsTotal: number): Promise<CouponEvaluation> {
    const coupon = await CouponModel.findOne({ code: code.toUpperCase() });
    const now = new Date();

    if (
      !coupon ||
      !coupon.isActive ||
      coupon.validFrom > now ||
      coupon.validTo < now ||
      itemsTotal < coupon.minOrderValue ||
      (coupon.applicableRestaurantIds.length > 0 &&
        !(restaurantId && coupon.applicableRestaurantIds.some((id) => id.toString() === restaurantId)))
    ) {
      throw new HttpError(400, 'Coupon is not applicable');
    }

    if (coupon.totalUsageLimit > 0 && coupon.totalUsageCount >= coupon.totalUsageLimit) {
      throw new HttpError(400, 'Coupon usage limit reached');
    }

    if (coupon.usageLimitPerUser > 0) {
      const usedCount = await OrderModel.countDocuments({ customerId: userId, couponCode: coupon.code });
      if (usedCount >= coupon.usageLimitPerUser) {
        throw new HttpError(400, 'You have already used this coupon');
      }
    }

    const rawDiscount = coupon.discountType === 'PERCENT' ? (itemsTotal * coupon.value) / 100 : coupon.value;
    const discount = Math.min(Math.round(rawDiscount), coupon.maxDiscount ?? Number.MAX_SAFE_INTEGER, itemsTotal);

    return { coupon, discount };
  },

  // --- ADMIN CRUD (docs/API-SPEC.md §13, docs/ROLE-PERMISSIONS.md: coupon:manage) ---

  async listAll(page: number, limit: number, isActive?: boolean) {
    const filter: Record<string, unknown> = typeof isActive === 'boolean' ? { isActive } : {};
    const [items, total] = await Promise.all([
      CouponModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      CouponModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  async getById(id: string) {
    const coupon = await CouponModel.findById(id);
    if (!coupon) {
      throw new HttpError(404, 'Coupon not found');
    }
    return coupon;
  },

  async create(input: Partial<CouponDocument> & { code: string }) {
    const existing = await CouponModel.findOne({ code: input.code.toUpperCase() });
    if (existing) {
      throw new HttpError(409, 'A coupon with this code already exists');
    }
    return CouponModel.create({ ...input, code: input.code.toUpperCase() });
  },

  async update(id: string, patch: Partial<CouponDocument>) {
    const coupon = await this.getById(id);
    Object.assign(coupon, patch);
    await coupon.save();
    return coupon;
  },

  async remove(id: string) {
    const coupon = await this.getById(id);
    await coupon.deleteOne();
  },
};
