package com.kuraliupdates.bazaar.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Periodically expires unpaid seller-direct UPI obligations without touching COD orders. */
@Component
@RequiredArgsConstructor
@Slf4j
public class SellerPaymentExpiryScheduler {
    private final SellerDirectPaymentService payments;

    @Scheduled(fixedDelayString = "${kurali.payments.expiry-scan-ms:60000}")
    public void expirePendingSellerPayments() {
        int expired = payments.expirePendingPaymentsBatch();
        if (expired > 0) log.info("Expired {} unpaid seller payment record(s)", expired);
    }
}
