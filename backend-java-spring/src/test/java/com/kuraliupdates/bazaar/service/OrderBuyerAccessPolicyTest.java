package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.OrderEntity;
import com.kuraliupdates.bazaar.entity.UserEntity;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class OrderBuyerAccessPolicyTest {
    @Test
    void normalizesBuyerEmailUsingRootLocaleRules() {
        assertEquals("buyer@example.com", OrderBuyerAccessPolicy.normalizedEmail(" Buyer@Example.com "));
    }

    @Test
    void stableUserIdMismatchCannotBeOverriddenByMatchingEmail() {
        OrderEntity order = OrderEntity.builder()
                .buyerUserId("USER-ORIGINAL")
                .buyerEmail("shared@example.com")
                .build();
        UserEntity differentAccount = UserEntity.builder()
                .userId("USER-OTHER")
                .email("shared@example.com")
                .build();

        assertFalse(OrderBuyerAccessPolicy.owns(order, differentAccount));
        assertTrue(OrderBuyerAccessPolicy.owns(order, UserEntity.builder()
                .userId("USER-ORIGINAL").email("different@example.com").build()));
    }

    @Test
    void legacyOrderWithoutStableUserIdCanUseEmailCompatibility() {
        OrderEntity legacyOrder = OrderEntity.builder().buyerEmail("Buyer@Example.com").build();
        UserEntity buyer = UserEntity.builder().userId("USER-1").email("buyer@example.com").build();

        assertTrue(OrderBuyerAccessPolicy.owns(legacyOrder, buyer));
    }

    @Test
    void ownershipCheckIsCaseInsensitiveAndRejectsMissingOrderEmail() {
        OrderEntity order = OrderEntity.builder().buyerEmail("Buyer@Example.com").build();

        assertTrue(OrderBuyerAccessPolicy.owns(order, " buyer@example.com "));
        assertFalse(OrderBuyerAccessPolicy.owns(order, "other@example.com"));
        assertFalse(OrderBuyerAccessPolicy.owns(OrderEntity.builder().build(), "buyer@example.com"));
    }
}
