package com.kuraliupdates.bazaar.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class E2eOtpCaptureServiceTest {
    @Test
    void capturesAndConsumesOtpOnlyForAllowlistedStagingIdentity() {
        E2eOtpCaptureService service = new E2eOtpCaptureService(
                true, "staging", "buyer@example.com,admin@example.com");

        service.capture("Buyer@Example.com", "012345");

        assertEquals("012345", service.consume("buyer@example.com").orElseThrow());
        assertTrue(service.consume("buyer@example.com").isEmpty(), "OTP retrieval must be one-time");
    }

    @Test
    void doesNotCaptureOtpWhenEnvironmentIsNotStaging() {
        E2eOtpCaptureService service = new E2eOtpCaptureService(
                true, "production", "buyer@example.com");

        service.capture("buyer@example.com", "123456");

        assertTrue(service.consume("buyer@example.com").isEmpty());
    }

    @Test
    void doesNotCaptureUnallowlistedIdentityOrMalformedOtp() {
        E2eOtpCaptureService service = new E2eOtpCaptureService(
                true, "staging", "buyer@example.com");

        service.capture("other@example.com", "123456");
        service.capture("buyer@example.com", "12ab56");

        assertTrue(service.consume("buyer@example.com").isEmpty());
        assertTrue(service.consume("other@example.com").isEmpty());
    }

    @Test
    void disabledByDefaultAndRequiresStagingAndAllowlist() {
        assertFalse(new E2eOtpCaptureService(false, "staging", "buyer@example.com").isSafelyConfigured());
        assertFalse(new E2eOtpCaptureService(true, "production", "buyer@example.com").isSafelyConfigured());
        assertFalse(new E2eOtpCaptureService(true, "staging", "").isSafelyConfigured());
    }
}
