package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OrderBuyerAccessPolicyTest {
    @Test
    void normalizesBuyerEmailUsingRootLocaleRules() {
        assertEquals("buyer@example.com", OrderBuyerAccessPolicy.normalizedEmail(" Buyer@Example.com "));
    }

    @Test
    void ownershipCheckIsCaseInsensitiveAndRejectsMissingOrderEmail() {
        OrderEntity order = OrderEntity.builder().buyerEmail("Buyer@Example.com").build();

        assertTrue(OrderBuyerAccessPolicy.owns(order, " buyer@example.com "));
        assertFalse(OrderBuyerAccessPolicy.owns(order, "other@example.com"));
        assertFalse(OrderBuyerAccessPolicy.owns(OrderEntity.builder().build(), "buyer@example.com"));
    }
}
