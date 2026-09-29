import { OrderStatus, UserRole } from '@rbac/shared-types';
import { HttpError } from '../common/http-error';
import { AuditLogModel } from '../common/audit-log.model';
import { OrderModel } from '../orders/order.model';
import { UserModel } from '../users/user.model';
import { RestaurantModel } from '../restaurants/restaurant.model';
import { RestaurantApplicationModel } from '../restaurant-applications/restaurant-application.model';
import { DeliveryPartnerModel } from '../delivery/delivery-partner.model';
import { BannerModel, type BannerDocument } from './banner.model';
import { OfferModel, type OfferDocument } from './offer.model';

const ACTIVE_DELIVERY_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERY_ASSIGNED,
  OrderStatus.DELIVERY_ACCEPTED,
  OrderStatus.PICKED_UP,
  OrderStatus.OUT_FOR_DELIVERY,
];

export const adminService = {
  // GET /admin/dashboard — orders/revenue/customers/restaurants/partners/pending approvals/active
  // deliveries summary (docs/API-SPEC.md §16).
  async dashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      totalRestaurants,
      totalDeliveryPartners,
      pendingRestaurantApprovals,
      pendingDeliveryApprovals,
      activeDeliveries,
      todayOrders,
    ] = await Promise.all([
      UserModel.countDocuments({ role: UserRole.CUSTOMER }),
      RestaurantModel.countDocuments({ status: 'APPROVED' }),
      DeliveryPartnerModel.countDocuments({ status: 'APPROVED' }),
      RestaurantApplicationModel.countDocuments({ status: 'PENDING' }),
      DeliveryPartnerModel.countDocuments({ status: 'PENDING' }),
      OrderModel.countDocuments({ status: { $in: ACTIVE_DELIVERY_STATUSES } }),
      OrderModel.find({ createdAt: { $gte: startOfToday } }),
    ]);

    const revenueStatuses: OrderStatus[] = [
      OrderStatus.RESTAURANT_ACCEPTED,
      OrderStatus.PREPARING,
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.DELIVERY_ASSIGNED,
      OrderStatus.DELIVERY_ACCEPTED,
      OrderStatus.PICKED_UP,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];
    const todayRevenue = todayOrders
      .filter((o) => revenueStatuses.includes(o.status))
      .reduce((sum, o) => sum + o.pricing.grandTotal, 0);

    return {
      customers: totalCustomers,
      restaurants: totalRestaurants,
      deliveryPartners: totalDeliveryPartners,
      pendingApprovals: { restaurants: pendingRestaurantApprovals, deliveryPartners: pendingDeliveryApprovals },
      activeDeliveries,
      today: { orders: todayOrders.length, revenue: todayRevenue },
    };
  },

  // --- Reports (docs/API-SPEC.md §16) — simple date-range aggregations, no external BI tooling. ---

  async reportOrders(from?: Date, to?: Date) {
    const filter: Record<string, unknown> = {};
    if (from || to) filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const byStatus = await OrderModel.aggregate<{ _id: OrderStatus; count: number }>([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const total = await OrderModel.countDocuments(filter);
    return { total, byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])) };
  },

  async reportSales(from?: Date, to?: Date) {
    const filter: Record<string, unknown> = { status: OrderStatus.DELIVERED };
    if (from || to) filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const [agg] = await OrderModel.aggregate<{ _id: null; totalRevenue: number; totalOrders: number }>([
      { $match: filter },
      { $group: { _id: null, totalRevenue: { $sum: '$pricing.grandTotal' }, totalOrders: { $sum: 1 } } },
    ]);
    return { totalRevenue: agg?.totalRevenue ?? 0, totalOrders: agg?.totalOrders ?? 0 };
  },

  async reportRestaurants() {
    const byStatus = await RestaurantModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const topByRating = await RestaurantModel.find({ status: 'APPROVED' })
      .sort({ 'rating.avg': -1 })
      .limit(10)
      .select('name rating cuisines');
    return { byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])), topByRating };
  },

  async reportDeliveryPartners() {
    const byStatus = await DeliveryPartnerModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return { byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])) };
  },

  async reportCustomers() {
    const total = await UserModel.countDocuments({ role: UserRole.CUSTOMER });
    const active = await UserModel.countDocuments({ role: UserRole.CUSTOMER, status: 'ACTIVE' });
    const ordersByCustomer = await OrderModel.aggregate<{ _id: string; orders: number }>([
      { $group: { _id: '$customerId', orders: { $sum: 1 } } },
      { $sort: { orders: -1 } },
      { $limit: 10 },
    ]);
    return { total, active, topCustomersByOrderCount: ordersByCustomer };
  },

  // GET /admin/audit-logs — audit trail search (docs/API-SPEC.md §16).
  async listAuditLogs(page: number, limit: number, action?: string, targetType?: string) {
    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    const [items, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLogModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  // --- Marketing content: banners/offers (docs/API-SPEC.md §16, marketing:manage) ---

  async listBanners(page: number, limit: number) {
    const [items, total] = await Promise.all([
      BannerModel.find()
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      BannerModel.countDocuments(),
    ]);
    return { items, total, page, limit };
  },

  async createBanner(input: Partial<BannerDocument> & Pick<BannerDocument, 'title' | 'imageUrl'>) {
    return BannerModel.create(input);
  },

  async updateBanner(id: string, patch: Partial<BannerDocument>) {
    const banner = await BannerModel.findById(id);
    if (!banner) throw new HttpError(404, 'Banner not found');
    Object.assign(banner, patch);
    await banner.save();
    return banner;
  },

  async deleteBanner(id: string) {
    const banner = await BannerModel.findById(id);
    if (!banner) throw new HttpError(404, 'Banner not found');
    await banner.deleteOne();
  },

  async listOffers(page: number, limit: number) {
    const [items, total] = await Promise.all([
      OfferModel.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      OfferModel.countDocuments(),
    ]);
    return { items, total, page, limit };
  },

  async createOffer(input: Partial<OfferDocument> & Pick<OfferDocument, 'title' | 'validFrom' | 'validTo'>) {
    return OfferModel.create(input);
  },

  async updateOffer(id: string, patch: Partial<OfferDocument>) {
    const offer = await OfferModel.findById(id);
    if (!offer) throw new HttpError(404, 'Offer not found');
    Object.assign(offer, patch);
    await offer.save();
    return offer;
  },

  async deleteOffer(id: string) {
    const offer = await OfferModel.findById(id);
    if (!offer) throw new HttpError(404, 'Offer not found');
    await offer.deleteOne();
  },
};
