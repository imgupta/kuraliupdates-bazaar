package com.kuraliupdates.bazaar.dto.delivery;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.OrderItemEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Least-privilege view of an order for an authenticated delivery partner.
 * Deliberately excludes buyer email, payment/coupon details, discounts,
 * internal place IDs, delivery OTP and payout snapshots.
 */
public record DeliveryJobResponse(
        String orderId,
        String buyerName,
        String buyerPhone,
        String deliveryAddress,
        String deliveryLocality,
        BigDecimal deliveryLatitude,
        BigDecimal deliveryLongitude,
        String sellerName,
        String sellerAddress,
        String sellerLocality,
        String checkoutGroupId,
        String fulfilmentStatus,
        String fulfilmentMode,
        String status,
        String deliveryAgentId,
        BigDecimal distanceKm,
        Integer estimatedDeliveryMins,
        LocalDateTime placedAt,
        LocalDateTime updatedAt,
        List<DeliveryJobItemResponse> items
) {
    public static DeliveryJobResponse from(OrderEntity order) {
        return new DeliveryJobResponse(
                order.getOrderId(),
                order.getBuyerName(),
                order.getBuyerPhone(),
                order.getDeliveryAddress(),
                order.getDeliveryLocality(),
                order.getDeliveryLatitude(),
                order.getDeliveryLongitude(),
                order.getSeller() == null ? null : order.getSeller().getStoreName(),
                order.getSeller() == null ? null : order.getSeller().getAddress(),
                order.getSeller() == null ? null : order.getSeller().getLocality(),
                order.getCheckoutGroupId(),
                order.getFulfilmentStatus(),
                order.getFulfilmentMode(),
                order.getStatus(),
                order.getDeliveryAgent() == null ? null : order.getDeliveryAgent().getAgentId(),
                order.getDistanceKm(),
                order.getEstimatedDeliveryMins(),
                order.getPlacedAt(),
                order.getUpdatedAt(),
                order.getItems() == null ? List.of()
                        : order.getItems().stream().map(DeliveryJobItemResponse::from).toList()
        );
    }

    public record DeliveryJobItemResponse(String productId, String title, Integer quantity) {
        private static DeliveryJobItemResponse from(OrderItemEntity item) {
            return new DeliveryJobItemResponse(
                    item.getProduct() == null ? null : item.getProduct().getProductId(),
                    item.getProduct() == null ? null : item.getProduct().getTitle(),
                    item.getQuantity()
            );
        }
    }
}
