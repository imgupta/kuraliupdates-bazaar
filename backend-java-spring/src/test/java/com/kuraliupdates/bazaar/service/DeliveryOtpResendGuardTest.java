package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DeliveryOtpResendGuardTest {
    @Test
    void rejectsAResendWhenTheDatabaseGuardDoesNotAcquireTheWindow() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(0);

        ApiException error = assertThrows(ApiException.class,
                () -> DeliveryOtpResendGuard.requireAllowed(jdbc, new AtomicInteger(), "order:123"));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatus());
    }

    @Test
    void failsClosedWhenTheDatabaseGuardIsUnavailable() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.update(anyString(), any(Object[].class)))
                .thenThrow(new DataAccessResourceFailureException("database unavailable"));

        ApiException error = assertThrows(ApiException.class,
                () -> DeliveryOtpResendGuard.requireAllowed(jdbc, new AtomicInteger(), "order:123"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
    }
}
