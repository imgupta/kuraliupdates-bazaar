package com.kuraliupdates.bazaar.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Creates a standard UPI pay deep link for the seller-owned VPA snapshot.
 * This only launches a UPI app; it does not verify or confirm the payment.
 */
@Component
public class UpiIntentLinkFactory {
    private final boolean enabled;
    private final String scheme;

    public UpiIntentLinkFactory(
            @Value("${kurali.payments.upi-intent.enabled:false}") boolean enabled,
            @Value("${kurali.payments.upi-intent.scheme:upi}") String scheme) {
        this.enabled = enabled;
        this.scheme = scheme == null ? "upi" : scheme.trim().toLowerCase();
    }

    public String create(String paymentId, String orderId, BigDecimal amount, String upiId, String payeeName) {
        if (!enabled || !"upi".equals(scheme) || paymentId == null || orderId == null
                || amount == null || amount.signum() <= 0 || upiId == null || payeeName == null
                || !upiId.matches("[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}")
                || payeeName.isBlank()) {
            return null;
        }

        String note = "KuraliUpdates order " + orderId;
        return "upi://pay"
                + "?pa=" + encode(upiId)
                + "&pn=" + encode(payeeName)
                + "&am=" + encode(amount.stripTrailingZeros().toPlainString())
                + "&cu=INR"
                + "&tr=" + encode(paymentId)
                + "&tn=" + encode(note);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
