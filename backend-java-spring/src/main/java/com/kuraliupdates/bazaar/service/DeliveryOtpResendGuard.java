package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Database-backed, cross-instance resend guard for delivery OTPs.
 * The caller's transaction remains the transaction boundary; this service
 * deliberately does not create or commit an independent transaction.
 */
@Service
@RequiredArgsConstructor
public class DeliveryOtpResendGuard {
    private final JdbcTemplate jdbc;
    private final AtomicInteger cleanupCounter = new AtomicInteger();

    private static final String DELIVERY_OTP_RESEND_GUARD_MERGE = """
    MERGE INTO API_RATE_LIMIT_BUCKETS target
    USING (
    SELECT ? AS BUCKET_KEY, TIMESTAMP '1970-01-01 00:00:00' AS WINDOW_START FROM DUAL
    ) source
    ON (target.BUCKET_KEY = source.BUCKET_KEY AND target.WINDOW_START = source.WINDOW_START)
    WHEN MATCHED THEN UPDATE SET
    target.REQUEST_COUNT = 1,
    target.EXPIRES_AT = SYSTIMESTAMP + INTERVAL '60' SECOND
    WHERE target.EXPIRES_AT <= SYSTIMESTAMP
    WHEN NOT MATCHED THEN INSERT (BUCKET_KEY, WINDOW_START, REQUEST_COUNT, EXPIRES_AT)
    VALUES (source.BUCKET_KEY, source.WINDOW_START, 1, SYSTIMESTAMP + INTERVAL '60' SECOND)
    """;
    private static final String DELIVERY_OTP_RESEND_GUARD_CLEANUP =
    "DELETE FROM API_RATE_LIMIT_BUCKETS WHERE WINDOW_START = TIMESTAMP '1970-01-01 00:00:00' AND EXPIRES_AT < SYSTIMESTAMP";
    
    private final AtomicInteger resendGuardCleanupCounter = new AtomicInteger();
    private final SecureRandom secureRandom = new SecureRandom();

    public void requireAllowed(String rawKey) {
        String resendKey = hashResendKey(rawKey);
        int updated;
        try {
            updated = jdbc.update(DELIVERY_OTP_RESEND_GUARD_MERGE, resendKey);
        } catch (DuplicateKeyException firstInsertRace) {
            // Two instances may both observe no guard row. Retry once after the
            // winning transaction inserts the unique RESEND_KEY.
            try {
                updated = jdbc.update(DELIVERY_OTP_RESEND_GUARD_MERGE, resendKey);
            } catch (DataAccessException retryFailure) {
                throw unavailable();
            }
        } catch (DataAccessException databaseFailure) {
            throw unavailable();
        }
        if (updated == 0) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait 60 seconds before resending the delivery OTP");
        }

        if (cleanupCounter.incrementAndGet() % 100 == 0) {
            try {
                jdbc.update(DELIVERY_OTP_RESEND_GUARD_CLEANUP);
            } catch (DataAccessException ignored) {
                // Expired rows are safe to retain temporarily; cleanup must not
                // fail a successfully guarded OTP resend.
            }
        }
    }

    private ApiException unavailable() {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                "Delivery OTP resend protection is temporarily unavailable");
    }

    private String hashResendKey(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(("delivery-otp-resend\n" + value).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }
}
