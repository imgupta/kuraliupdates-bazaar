package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Oracle-backed fixed-window rate limiter. Only a SHA-256 bucket key is stored;
 * raw email, phone, IP and lead identifiers never enter the rate-limit table.
 */
@Service
@RequiredArgsConstructor
public class ApiRateLimitService {
    private static final Logger log = LoggerFactory.getLogger(ApiRateLimitService.class);
    private static final String CLEANUP_SQL = "DELETE FROM API_RATE_LIMIT_BUCKETS WHERE EXPIRES_AT < ? AND WINDOW_START <> TIMESTAMP '1970-01-01 00:00:00'";
    private static final String MERGE_SQL = """
            MERGE INTO API_RATE_LIMIT_BUCKETS target
            USING (SELECT ? AS BUCKET_KEY, ? AS WINDOW_START, ? AS EXPIRES_AT FROM DUAL) source
            ON (target.BUCKET_KEY = source.BUCKET_KEY AND target.WINDOW_START = source.WINDOW_START)
            WHEN MATCHED THEN UPDATE SET
                target.REQUEST_COUNT = target.REQUEST_COUNT + 1,
                target.EXPIRES_AT = source.EXPIRES_AT
                WHERE target.REQUEST_COUNT < ?
            WHEN NOT MATCHED THEN INSERT (BUCKET_KEY, WINDOW_START, REQUEST_COUNT, EXPIRES_AT)
                VALUES (source.BUCKET_KEY, source.WINDOW_START, 1, source.EXPIRES_AT)
            """;

    private final JdbcTemplate jdbc;
    private final AtomicInteger cleanupCounter = new AtomicInteger();

    public void requireAllowed(String scope, String rawKey, int limit, Duration window) {
        if (scope == null || scope.isBlank() || limit < 1 || window == null || window.isZero() || window.isNegative()) {
            throw new IllegalArgumentException("A rate-limit scope, positive limit and positive window are required");
        }
        String key = rawKey == null || rawKey.isBlank() ? "unknown" : rawKey.trim();
        String bucketKey = hash(scope + "\n" + key);
        long seconds = window.getSeconds();
        Instant now = Instant.now();
        long bucketEpoch = Math.floorDiv(now.getEpochSecond(), seconds) * seconds;
        LocalDateTime windowStart = LocalDateTime.ofInstant(Instant.ofEpochSecond(bucketEpoch), ZoneOffset.UTC);
        LocalDateTime expiresAt = windowStart.plusSeconds(seconds * 2);

        int updated;
        try {
            updated = merge(bucketKey, windowStart, expiresAt, limit);
        } catch (DuplicateKeyException concurrentInsert) {
            // Oracle MERGE can report ORA-00001 when two first requests race to
            // create the same bucket. Retry once; the winning row is now matched.
            try {
                updated = merge(bucketKey, windowStart, expiresAt, limit);
            } catch (DuplicateKeyException retryFailure) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Request protection is temporarily unavailable");
            }
        }
        if (updated == 0) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please try again later.");
        }

        if (cleanupCounter.incrementAndGet() % 100 == 0) {
            // Expired-bucket cleanup is maintenance, not part of the request's
            // authorization decision. A transient cleanup failure must never
            // turn an otherwise allowed request into HTTP 500.
            try {
                jdbc.update(CLEANUP_SQL, LocalDateTime.ofInstant(now, ZoneOffset.UTC));
            } catch (RuntimeException cleanupFailure) {
                log.warn("Periodic API rate-limit bucket cleanup failed; enforcement remains active ({})",
                        cleanupFailure.getClass().getSimpleName());
            }
        }
    }

    public void clearBucket(String scope, String rawKey) {
        String key = rawKey == null || rawKey.isBlank() ? "unknown" : rawKey.trim();
        jdbc.update("DELETE FROM API_RATE_LIMIT_BUCKETS WHERE BUCKET_KEY = ?", hash(scope + "\n" + key));
    }

    private int merge(String bucketKey, LocalDateTime windowStart, LocalDateTime expiresAt, int limit) {
        return jdbc.update(MERGE_SQL, bucketKey, windowStart, expiresAt, limit);
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }
}
