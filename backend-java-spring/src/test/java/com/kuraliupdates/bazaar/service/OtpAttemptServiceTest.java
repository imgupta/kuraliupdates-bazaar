package com.kuraliupdates.bazaar.service;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.sql.Timestamp;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OtpAttemptServiceTest {
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final OtpAttemptService service = new OtpAttemptService(jdbcTemplate);

    @Test
    void failedAttemptUsesAtomicConditionalUpdateAndConsumesAtLimit() {
        when(jdbcTemplate.update(anyString(), eq("otp-1"), any(Timestamp.class))).thenReturn(1);

        service.registerFailedAttempt("otp-1", LocalDateTime.now());

        verify(jdbcTemplate).update(
                contains("ATTEMPTS = ATTEMPTS + 1"),
                eq("otp-1"), any(Timestamp.class));
        verify(jdbcTemplate).update(
                contains("IS_USED = CASE WHEN ATTEMPTS + 1 >= 5 THEN 1 ELSE IS_USED END"),
                eq("otp-1"), any(Timestamp.class));
        verify(jdbcTemplate).update(
                contains("AND IS_USED = 0"),
                eq("otp-1"), any(Timestamp.class));
        verify(jdbcTemplate).update(
                contains("AND ATTEMPTS < 5"),
                eq("otp-1"), any(Timestamp.class));
    }

    @Test
    void consumeReturnsTrueOnlyWhenOneActiveOtpWasConsumed() {
        when(jdbcTemplate.update(anyString(), eq("otp-2"), any(Timestamp.class))).thenReturn(1);

        assertTrue(service.consume("otp-2", LocalDateTime.now()));

        verify(jdbcTemplate).update(
                contains("SET IS_USED = 1"),
                eq("otp-2"), any(Timestamp.class));
    }

    @Test
    void consumeReturnsFalseWhenOtpWasAlreadyUsedExpiredOrExhausted() {
        when(jdbcTemplate.update(anyString(), eq("otp-3"), any(Timestamp.class))).thenReturn(0);

        assertFalse(service.consume("otp-3", LocalDateTime.now()));

        verify(jdbcTemplate).update(
                contains("AND IS_USED = 0"),
                eq("otp-3"), any(Timestamp.class));
        verify(jdbcTemplate).update(
                contains("AND ATTEMPTS < 5"),
                eq("otp-3"), any(Timestamp.class));
        verify(jdbcTemplate).update(
                contains("AND EXPIRES_AT > ?"),
                eq("otp-3"), any(Timestamp.class));
    }

    @Test
    void failedAttemptAndConsumptionUseIndependentTransactions() throws Exception {
        Method failedAttempt = OtpAttemptService.class.getMethod(
                "registerFailedAttempt", String.class, LocalDateTime.class);
        Method consume = OtpAttemptService.class.getMethod("consume", String.class, LocalDateTime.class);

        assertEquals(Propagation.REQUIRES_NEW, failedAttempt.getAnnotation(Transactional.class).propagation());
        assertEquals(Propagation.REQUIRES_NEW, consume.getAnnotation(Transactional.class).propagation());
    }
}
