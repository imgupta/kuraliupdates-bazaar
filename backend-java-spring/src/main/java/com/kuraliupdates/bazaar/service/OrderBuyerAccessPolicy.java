package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.OrderEntity;
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
        return order.getBuyerEmail() != null
                && order.getBuyerEmail().equalsIgnoreCase(buyerEmail.trim());
    }
}
