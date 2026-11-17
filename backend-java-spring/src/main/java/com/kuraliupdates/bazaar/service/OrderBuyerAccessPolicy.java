package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Read-only buyer identity policy shared by order history and ownership checks.
 * Authentication/session role validation remains in the controller/service.
 */
@Component
public class OrderBuyerAccessPolicy {
    public String normalizedEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public boolean owns(OrderEntity order, String buyerEmail) {
        return order.getBuyerEmail() != null
                && order.getBuyerEmail().equalsIgnoreCase(buyerEmail.trim());
    }
}
