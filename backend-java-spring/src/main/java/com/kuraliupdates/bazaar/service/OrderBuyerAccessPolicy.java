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
        if (buyer.getUserId() != null && order.getBuyerUserId() != null
                && buyer.getUserId().equals(order.getBuyerUserId())) return true;
        return owns(order, buyer.getEmail());
    }
}
