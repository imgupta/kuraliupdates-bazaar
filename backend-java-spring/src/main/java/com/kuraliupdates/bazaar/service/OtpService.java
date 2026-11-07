package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.entity.AuthOtpEntity;
import com.kuraliupdates.bazaar.exception.ApiException;
import com.kuraliupdates.bazaar.repository.AuthOtpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OtpService {
    /**
     * Persistent sliding cooldown guard. The sentinel window keeps one row per
     * domain-separated identifier/type key; Oracle's clock decides whether the
     * previous cooldown has expired, so multiple application instances cannot
     * both reserve the same resend window.
     */
    private static final String OTP_RESEND_GUARD_MERGE = """
            MERGE INTO API_RATE_LIMIT_BUCKETS target
            USING (SELECT ? AS BUCKET_KEY, TIMESTAMP '1970-01-01 00:00:00' AS WINDOW_START FROM DUAL) source
            ON (target.BUCKET_KEY = source.BUCKET_KEY AND target.WINDOW_START = source.WINDOW_START)
            WHEN MATCHED THEN UPDATE SET
                target.REQUEST_COUNT = 1,
                target.EXPIRES_AT = SYSTIMESTAMP + NUMTODSINTERVAL(?, 'SECOND')
                WHERE target.EXPIRES_AT <= SYSTIMESTAMP
            WHEN NOT MATCHED THEN INSERT (BUCKET_KEY, WINDOW_START, REQUEST_COUNT, EXPIRES_AT)
                VALUES (source.BUCKET_KEY, source.WINDOW_START, 1,
                        SYSTIMESTAMP + NUMTODSINTERVAL(?, 'SECOND'))
            """;
    private static final String OTP_RESEND_GUARD_SCOPE = "OTP_RESEND_V1";
    private final AuthOtpRepository repository;
    private final OtpDeliveryService deliveryService;
    private final E2eOtpCaptureService e2eOtpCaptureService;
    private final JdbcTemplate jdbcTemplate;
    private final OtpAttemptService otpAttemptService;
    private final SecureRandom secureRandom = new SecureRandom();

    public int getResendCooldownSeconds() {
        try {
            Integer configured = jdbcTemplate.queryForObject(
                    "SELECT OTP_RESEND_TIMEOUT_SECONDS FROM DELIVERY_CONFIGURATION WHERE CONFIG_ID=1",
                    Integer.class);
            return configured == null ? 20 : Math.max(5, Math.min(300, configured));
        } catch (Exception ignored) {
            // Keep authentication available during a rolling migration; V21 seeds 20 seconds.
            return 20;
        }
    }

    @Transactional
    public void send(String identifier, String type) {
        LocalDateTime now = LocalDateTime.now();
        int cooldownSeconds = getResendCooldownSeconds();
        // Only allowlisted identities in explicitly enabled staging E2E may skip cooldown.
        boolean bypassCooldown = e2eOtpCaptureService.mayBypassCooldown(identifier);
        if (!bypassCooldown) {
            reserveResendCooldown(identifier, type, cooldownSeconds);
            // Retain the historical sliding-window check while the persistent
            // guard protects simultaneous requests and multiple app instances.
            if (repository.existsRecentOtp(identifier, type, now.minusSeconds(cooldownSeconds))) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                        "Please wait " + cooldownSeconds + " seconds before requesting another OTP");
            }
        }

        String otp = String.format("%06d", 100000 + secureRandom.nextInt(900000));
        AuthOtpEntity entity = AuthOtpEntity.builder()
                .otpId("otp-" + UUID.randomUUID())
                .identifier(identifier)
                .otpCode(hash(otp))
                .otpType(type)
                .isUsed(0)
                .attempts(0)
                .expiresAt(now.plusMinutes(10))
                .createdAt(now)
                .build();

        // For allowlisted identities only, safely enabled staging E2E captures email OTPs
        // in memory and must never send those codes to an external email provider.
        try {
            if (!e2eOtpCaptureService.shouldSuppressEmailDelivery(identifier, type)) {
                deliveryService.sendOtp(identifier, type, otp, 10);
            }
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Unable to deliver the verification code right now. Please try again later.");
        }
        repository.save(entity);
        // Capture is a no-op unless the staging feature is safely configured and identity allowlisted.
        e2eOtpCaptureService.capture(identifier, otp);
    }

    @Transactional
    public void verify(String identifier, String type, String otp) {
        if (otp == null || !otp.matches("\\d{6}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP must be 6 digits");
        }

        Optional<AuthOtpEntity> record = repository
                .findFirstByIdentifierAndOtpTypeAndIsUsedAndAttemptsLessThanAndExpiresAtAfterOrderByCreatedAtDesc(
                        identifier, type, 0, 5, LocalDateTime.now());

        if (record.isEmpty() || !matches(otp, record.get().getOtpCode())) {
            record.ifPresent(entity -> otpAttemptService.registerFailedAttempt(entity.getOtpId(), LocalDateTime.now()));
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid or expired OTP. Please request a new code.");
        }

        if (!otpAttemptService.consume(record.get().getOtpId(), LocalDateTime.now())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid or expired OTP. Please request a new code.");
        }
    }

    private void reserveResendCooldown(String identifier, String type, int cooldownSeconds) {
        if (identifier == null || identifier.isBlank() || type == null || type.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A valid OTP identifier and type are required");
        }
        String normalizedType = type.trim().toUpperCase(Locale.ROOT);
        String normalizedIdentifier = identifier.trim().toLowerCase(Locale.ROOT);
        // The raw email/phone is never persisted in API_RATE_LIMIT_BUCKETS.
        String bucketKey = hash(OTP_RESEND_GUARD_SCOPE + "\n" + normalizedType + "\n" + normalizedIdentifier);
        try {
            int reserved = jdbcTemplate.update(OTP_RESEND_GUARD_MERGE,
                    bucketKey, cooldownSeconds, cooldownSeconds);
            if (reserved == 0) {
                throw cooldownRejected(cooldownSeconds);
            }
        } catch (DuplicateKeyException firstInsertRace) {
            // Oracle MERGE can raise ORA-00001 when two instances both observe
            // the first-use gap. Retry against the row created by the winner.
            try {
                int reserved = jdbcTemplate.update(OTP_RESEND_GUARD_MERGE,
                        bucketKey, cooldownSeconds, cooldownSeconds);
                if (reserved == 0) {
                    throw cooldownRejected(cooldownSeconds);
                }
            } catch (DuplicateKeyException unresolvedRace) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                        "OTP protection is temporarily unavailable. Please try again later.");
            } catch (DataAccessException databaseFailure) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                        "OTP protection is temporarily unavailable. Please try again later.");
            }
        } catch (DataAccessException databaseFailure) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "OTP protection is temporarily unavailable. Please try again later.");
        }
    }

    private ApiException cooldownRejected(int cooldownSeconds) {
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                "Please wait " + cooldownSeconds + " seconds before requesting another OTP");
    }

    private boolean matches(String entered, String storedHash) {
        return MessageDigest.isEqual(hash(entered).getBytes(StandardCharsets.UTF_8),
                storedHash.getBytes(StandardCharsets.UTF_8));
    }

    private String hash(String otp) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(otp.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash OTP", ex);
        }
    }
}
