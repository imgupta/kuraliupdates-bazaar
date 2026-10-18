package com.kuraliupdates.bazaar.dto.order;

import com.kuraliupdates.bazaar.entity.OrderItemEntity;
import java.math.BigDecimal;

public record OrderItemResponse(
        String productId, String title, Integer quantity,
        BigDecimal unitPrice, BigDecimal negotiatedPrice, BigDecimal totalPrice
) {
    public static OrderItemResponse from(OrderItemEntity item) {
        return new OrderItemResponse(item.getProduct().getProductId(), item.getProduct().getTitle(),
                item.getQuantity(), item.getUnitPrice(), item.getNegotiatedPrice(), item.getTotalPrice());
    }
}
