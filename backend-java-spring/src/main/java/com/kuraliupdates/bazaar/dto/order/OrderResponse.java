package com.kuraliupdates.bazaar.dto.order;

import com.kuraliupdates.bazaar.entity.OrderEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OrderResponse(
        String orderId,
        String buyerName,
        String buyerPhone,
        String buyerEmail,
        String deliveryAddress,
        String deliveryLocality,
        BigDecimal deliveryLatitude,
        BigDecimal deliveryLongitude,
        String deliveryPlaceId,
        String sellerId,
        BigDecimal subtotal,
        BigDecimal billDiscountAmount,
        BigDecimal couponDiscountAmount,
        String couponCode,
        BigDecimal deliveryFee,
        Integer isFreeDelivery,
        BigDecimal totalAmount,
        String paymentMethod,
        String paymentStatus,
        String status,
        String deliveryAgentId,
        BigDecimal distanceKm,
        Integer estimatedDeliveryMins,
        LocalDateTime placedAt,
        LocalDateTime updatedAt
) {
    public static OrderResponse from(OrderEntity order) {
        return new OrderResponse(
                order.getOrderId(), order.getBuyerName(), order.getBuyerPhone(), order.getBuyerEmail(),
                order.getDeliveryAddress(), order.getDeliveryLocality(), order.getDeliveryLatitude(),
                order.getDeliveryLongitude(), order.getDeliveryPlaceId(),
                order.getSeller() == null ? null : order.getSeller().getSellerId(),
                order.getSubtotal(), order.getBillDiscountAmount(), order.getCouponDiscountAmount(),
                order.getCouponCode(), order.getDeliveryFee(), order.getIsFreeDelivery(),
                order.getTotalAmount(), order.getPaymentMethod(), order.getPaymentStatus(),
                order.getStatus(), order.getDeliveryAgent() == null ? null : order.getDeliveryAgent().getAgentId(),
                order.getDistanceKm(), order.getEstimatedDeliveryMins(), order.getPlacedAt(), order.getUpdatedAt()
        );
    }
}
