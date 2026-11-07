package com.kuraliupdates.bazaar.dto.delivery;

import com.kuraliupdates.bazaar.entity.OrderEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Public-to-eligible-riders preview of an unclaimed job.
 * Exact buyer contact/address/location is withheld until assignment succeeds.
 */
public record AvailableDeliveryJobResponse(
        String orderId,
        String deliveryLocality,
        String sellerName,
        String sellerAddress,
        String sellerLocality,
        String checkoutGroupId,
        String fulfilmentStatus,
        String fulfilmentMode,
        String status,
        BigDecimal distanceKm,
        Integer estimatedDeliveryMins,
        LocalDateTime placedAt
) {
    public static AvailableDeliveryJobResponse from(OrderEntity order) {
        return new AvailableDeliveryJobResponse(
                order.getOrderId(),
                order.getDeliveryLocality(),
                order.getSeller() == null ? null : order.getSeller().getStoreName(),
                order.getSeller() == null ? null : order.getSeller().getAddress(),
                order.getSeller() == null ? null : order.getSeller().getLocality(),
                order.getCheckoutGroupId(),
                order.getFulfilmentStatus(),
                order.getFulfilmentMode(),
                order.getStatus(),
                order.getDistanceKm(),
                order.getEstimatedDeliveryMins(),
                order.getPlacedAt()
        );
    }
}
