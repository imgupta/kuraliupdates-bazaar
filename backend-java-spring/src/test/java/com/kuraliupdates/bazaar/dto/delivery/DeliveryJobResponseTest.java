package com.kuraliupdates.bazaar.dto.delivery;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.kuraliupdates.bazaar.entity.OrderEntity;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class DeliveryJobResponseTest {

    @Test
    void deliveryJobJsonContainsOnlyFieldsRequiredForPickupAndDropoff() throws Exception {
        OrderEntity order = OrderEntity.builder()
                .orderId("ORD-DELIVERY-DTO")
                .buyerName("Synthetic Buyer")
                .buyerPhone("TEST-PHONE")
                .buyerEmail("buyer-email-marker")
                .deliveryAddress("12 Market Road")
                .deliveryLocality("Kurali")
                .deliveryLatitude(new BigDecimal("30.8321"))
                .deliveryLongitude(new BigDecimal("76.5754"))
                .deliveryPlaceId("internal-place-marker")
                .couponCode("PRIVATE-COUPON-MARKER")
                .subtotal(new BigDecimal("120.00"))
                .totalAmount(new BigDecimal("120.00"))
                .paymentMethod("COD")
                .paymentStatus("PENDING")
                .deliveryOtp("TEST-OTP-MARKER")
                .riderPayoutSnapshot(new BigDecimal("45.00"))
                .fulfilmentMode("DELIVERY")
                .status("READY_FOR_PICKUP")
                .items(List.of())
                .build();

        DeliveryJobResponse response = DeliveryJobResponse.from(order);
        String json = new ObjectMapper().registerModule(new JavaTimeModule()).writeValueAsString(response);

        assertEquals("ORD-DELIVERY-DTO", response.orderId());
        assertEquals("Synthetic Buyer", response.buyerName());
        assertEquals("TEST-PHONE", response.buyerPhone());
        assertEquals("12 Market Road", response.deliveryAddress());
        assertTrue(json.contains("\"buyerName\""));
        assertTrue(json.contains("\"buyerPhone\""));
        assertTrue(json.contains("\"deliveryAddress\""));
        assertFalse(json.contains("buyerEmail"));
        assertFalse(json.contains("buyer-email-marker"));
        assertFalse(json.contains("couponCode"));
        assertFalse(json.contains("PRIVATE-COUPON-MARKER"));
        assertFalse(json.contains("paymentStatus"));
        assertFalse(json.contains("PENDING"));
        assertFalse(json.contains("deliveryOtp"));
        assertFalse(json.contains("TEST-OTP-MARKER"));
        assertFalse(json.contains("riderPayoutSnapshot"));
        assertFalse(json.contains("internal-place-marker"));
    }

    @Test
    void deliveryJobItemProjectionDoesNotExposeCommercialPricing() throws Exception {
        var item = new DeliveryJobResponse.DeliveryJobItemResponse("PROD-1", "Milk", 2);
        String json = new ObjectMapper().writeValueAsString(item);

        assertTrue(json.contains("\"productId\""));
        assertTrue(json.contains("\"title\""));
        assertTrue(json.contains("\"quantity\""));
        assertFalse(json.contains("unitPrice"));
        assertFalse(json.contains("negotiatedPrice"));
        assertFalse(json.contains("totalPrice"));
    }
}
