package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import java.util.Locale;

/**
 * Read-only buyer identity policy shared by order history and ownership checks.
 * Authentication/session role validation remains in the controller/service.
 */
public final class OrderBuyerAccessPolicy {
    public static String normalizedEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public static boolean owns(OrderEntity order, String buyerEmail) {
        return order != null && buyerEmail != null && order.getBuyerEmail() != null
                && order.getBuyerEmail().equalsIgnoreCase(buyerEmail.trim());
    }

    public static boolean owns(OrderEntity order, UserEntity buyer) {
        if (order == null || buyer == null) return false;
        // Stable user IDs are authoritative whenever an order has one. Do not
        // fall back to a matching email after an ID mismatch: email reuse or
        // account changes must never transfer ownership of an existing order.
        if (order.getBuyerUserId() != null && !order.getBuyerUserId().isBlank()) {
            return buyer.getUserId() != null && order.getBuyerUserId().equals(buyer.getUserId());
        }
        // Legacy orders without a stable owner ID retain the historical
        // normalized-email compatibility path.
        return owns(order, buyer.getEmail());
    }
}
