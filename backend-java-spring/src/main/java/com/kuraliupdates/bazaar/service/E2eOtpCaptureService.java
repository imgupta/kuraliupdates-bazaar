package com.kuraliupdates.bazaar.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * In-memory OTP handoff for explicitly enabled staging E2E tests only.
 * OTP values are never persisted or logged by this service.
 */
@Service
public class E2eOtpCaptureService {
    private static final long TTL_SECONDS = 180;

    private final boolean enabled;
    private final String environment;
    private final String token;
    private final Set<String> allowedIdentifiers;
    private final Map<String, CapturedOtp> latest = new ConcurrentHashMap<>();

    public E2eOtpCaptureService(
            @Value("${E2E_OTP_CAPTURE_ENABLED:false}") boolean enabled,
            @Value("${E2E_OTP_CAPTURE_ENV:}") String environment,
            @Value("${E2E_OTP_ALLOWED_IDENTIFIERS:}") String allowedIdentifiers,
            @Value("${E2E_OTP_CAPTURE_TOKEN:}") String token) {
        this.enabled = enabled;
        this.environment = environment == null ? "" : environment.trim().toLowerCase();
        this.token = token == null ? "" : token;
        this.allowedIdentifiers = Arrays.stream((allowedIdentifiers == null ? "" : allowedIdentifiers).split(","))
                .map(E2eOtpCaptureService::normalize)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    public boolean isSafelyConfigured() {
        return enabled && "staging".equals(environment) && !allowedIdentifiers.isEmpty();
    }

    /** Fail-closed authorization for the staging-only OTP cooldown bypass. */
    public boolean isAuthorizedForSend(String identifier, String suppliedToken) {
        if (!isSafelyConfigured() || token.length() < 32 || suppliedToken == null
                || !allowedIdentifiers.contains(normalize(identifier))) return false;
        return MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8), suppliedToken.getBytes(StandardCharsets.UTF_8));
    }

    public void capture(String identifier, String otp) {
        String key = normalize(identifier);
        if (!isSafelyConfigured() || !allowedIdentifiers.contains(key)
                || otp == null || !otp.matches("\\d{6}")) {
            return;
        }
        latest.put(key, new CapturedOtp(otp, Instant.now().getEpochSecond()));
        latest.entrySet().removeIf(entry -> Instant.now().getEpochSecond() - entry.getValue().createdAt() > TTL_SECONDS);
    }

    public Optional<String> consume(String identifier) {
        String key = normalize(identifier);
        if (!isSafelyConfigured() || !allowedIdentifiers.contains(key)) return Optional.empty();
        CapturedOtp captured = latest.remove(key);
        if (captured == null || Instant.now().getEpochSecond() - captured.createdAt() > TTL_SECONDS) {
            return Optional.empty();
        }
        return Optional.of(captured.otp());
    }

    public static String normalize(String identifier) {
        return identifier == null ? "" : identifier.trim().toLowerCase();
    }

    private record CapturedOtp(String otp, long createdAt) {}
}
