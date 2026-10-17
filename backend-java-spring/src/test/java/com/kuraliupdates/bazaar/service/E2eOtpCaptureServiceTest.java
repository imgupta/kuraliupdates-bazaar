package com.kuraliupdates.bazaar.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class E2eOtpCaptureServiceTest {
    @Test
    void capturesAndConsumesOtpOnlyForAllowlistedStagingIdentity() {
        E2eOtpCaptureService service = new E2eOtpCaptureService(
                true, "staging", "buyer@example.com,admin@example.com", "test-token-123456789012345678901234567890");

        service.capture("Buyer@Example.com", "012345");

        assertEquals("012345", service.consume("buyer@example.com").orElseThrow());
        assertTrue(service.consume("buyer@example.com").isEmpty(), "OTP retrieval must be one-time");
    }

    @Test
    void doesNotCaptureOtpWhenEnvironmentIsNotStaging() {
        E2eOtpCaptureService service = new E2eOtpCaptureService(
                true, "production", "buyer@example.com", "test-token-123456789012345678901234567890");

        service.capture("buyer@example.com", "123456");

        assertTrue(service.consume("buyer@example.com").isEmpty());
    }

    @Test
    void doesNotCaptureUnallowlistedIdentityOrMalformedOtp() {
        E2eOtpCaptureService service = new E2eOtpCaptureService(
                true, "staging", "buyer@example.com", "test-token-123456789012345678901234567890");

        service.capture("other@example.com", "123456");
        service.capture("buyer@example.com", "12ab56");

        assertTrue(service.consume("buyer@example.com").isEmpty());
        assertTrue(service.consume("other@example.com").isEmpty());
    }

    @Test
    void cooldownBypassRequiresStagingSecretAndAllowlistedIdentity() {
        String token = "test-token-123456789012345678901234567890";
        E2eOtpCaptureService service = new E2eOtpCaptureService(
                true, "staging", "buyer@example.com", token);

        assertTrue(service.isAuthorizedForSend("Buyer@Example.com", token));
        assertFalse(service.isAuthorizedForSend("buyer@example.com", "wrong-token"));
        assertFalse(service.isAuthorizedForSend("other@example.com", token));
        assertFalse(service.isAuthorizedForSend("buyer@example.com", null));
    }

    @Test
    void disabledByDefaultAndRequiresStagingAndAllowlist() {
        assertFalse(new E2eOtpCaptureService(false, "staging", "buyer@example.com", "test-token-123456789012345678901234567890").isSafelyConfigured());
        assertFalse(new E2eOtpCaptureService(true, "production", "buyer@example.com", "test-token-123456789012345678901234567890").isSafelyConfigured());
        assertFalse(new E2eOtpCaptureService(true, "staging", "", "test-token-123456789012345678901234567890").isSafelyConfigured());
    }
}
