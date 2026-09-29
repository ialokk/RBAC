"use strict";
// Placeholder shared enums/interfaces — extended as each phase introduces real contracts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["CUSTOMER"] = "CUSTOMER";
    UserRole["RESTAURANT"] = "RESTAURANT";
    UserRole["DELIVERY_PARTNER"] = "DELIVERY_PARTNER";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["CREATED"] = "CREATED";
    OrderStatus["PAYMENT_PENDING"] = "PAYMENT_PENDING";
    OrderStatus["PAID"] = "PAID";
    OrderStatus["PAYMENT_FAILED"] = "PAYMENT_FAILED";
    OrderStatus["RESTAURANT_PENDING"] = "RESTAURANT_PENDING";
    OrderStatus["RESTAURANT_ACCEPTED"] = "RESTAURANT_ACCEPTED";
    OrderStatus["RESTAURANT_REJECTED"] = "RESTAURANT_REJECTED";
    OrderStatus["PREPARING"] = "PREPARING";
    OrderStatus["READY_FOR_PICKUP"] = "READY_FOR_PICKUP";
    OrderStatus["DELIVERY_ASSIGNED"] = "DELIVERY_ASSIGNED";
    OrderStatus["DELIVERY_ACCEPTED"] = "DELIVERY_ACCEPTED";
    OrderStatus["PICKED_UP"] = "PICKED_UP";
    OrderStatus["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["CUSTOMER_CANCELLED"] = "CUSTOMER_CANCELLED";
    OrderStatus["RESTAURANT_CANCELLED"] = "RESTAURANT_CANCELLED";
    OrderStatus["DELIVERY_CANCELLED"] = "DELIVERY_CANCELLED";
    OrderStatus["REFUND_PENDING"] = "REFUND_PENDING";
    OrderStatus["REFUNDED"] = "REFUNDED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
//# sourceMappingURL=index.js.map