package com.kuraliupdates.bazaar.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

class UpiIntentLinkFactoryTest {
    @Test
    void createsEncodedSellerDirectIntentWithExactAmountAndPaymentReference() {
        UpiIntentLinkFactory factory = new UpiIntentLinkFactory(true, "upi");

        String link = factory.create("PAY-123456", "ORDER-42", new BigDecimal("450.00"),
                "seller.store@okaxis", "Kurali Store & Grocery");

        assertNotNull(link);
        assertTrue(link.startsWith("upi://pay?"));
        Map<String, String> query = Arrays.stream(URI.create(link).getRawQuery().split("&"))
                .map(pair -> pair.split("=", 2))
                .collect(Collectors.toMap(pair -> pair[0],
                        pair -> URLDecoder.decode(pair[1], StandardCharsets.UTF_8)));
        assertEquals("seller.store@okaxis", query.get("pa"));
        assertEquals("Kurali Store & Grocery", query.get("pn"));
        assertEquals("450", query.get("am"));
        assertEquals("INR", query.get("cu"));
        assertEquals("PAY-123456", query.get("tr"));
        assertEquals("KuraliUpdates order ORDER-42", query.get("tn"));
    }

    @Test
    void isDisabledByDefaultAndRejectsInvalidInputs() {
        assertNull(new UpiIntentLinkFactory(false, "upi")
                .create("PAY-1", "ORDER-1", BigDecimal.TEN, "seller@upi", "Seller"));
        assertNull(new UpiIntentLinkFactory(true, "https")
                .create("PAY-1", "ORDER-1", BigDecimal.TEN, "seller@upi", "Seller"));
        assertNull(new UpiIntentLinkFactory(true, "upi")
                .create("PAY-1", "ORDER-1", BigDecimal.ZERO, "seller@upi", "Seller"));
        assertNull(new UpiIntentLinkFactory(true, "upi")
                .create("PAY-1", "ORDER-1", BigDecimal.TEN, "not-a-vpa", "Seller"));
    }
}
