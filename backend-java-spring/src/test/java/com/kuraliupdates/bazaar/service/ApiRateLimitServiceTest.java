package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ApiRateLimitServiceTest {
    private static final String MERGE = "MERGE INTO API_RATE_LIMIT_BUCKETS";

    @Test
    void firstRequestCreatesHashedWindowBucket() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.update(startsWith(MERGE), any(), any(), any(), anyInt())).thenReturn(1);

        new ApiRateLimitService(jdbc).requireAllowed("seller-lead", "person@example.test:9876500000", 3,
                Duration.ofHours(1));

        verify(jdbc).update(startsWith(MERGE), any(), any(), any(), eq(3));
        verify(jdbc, never()).update(contains("person@example.test"), any(Object[].class));
    }

    @Test
    void deniesRequestWhenAtomicWindowBucketHasReachedItsLimit() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.update(startsWith(MERGE), any(), any(), any(), anyInt())).thenReturn(0);

        ApiException error = assertThrows(ApiException.class,
                () -> new ApiRateLimitService(jdbc).requireAllowed("search", "203.0.113.10", 60,
                        Duration.ofMinutes(1)));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, error.getStatus());
    }

    @Test
    void retriesOracleDuplicateKeyRaceOnceAgainstTheWinningBucket() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.update(startsWith(MERGE), any(), any(), any(), anyInt()))
                .thenThrow(new DuplicateKeyException("concurrent first insert"))
                .thenReturn(1);

        assertDoesNotThrow(() -> new ApiRateLimitService(jdbc)
                .requireAllowed("seller-lead", "contact-key", 3, Duration.ofHours(1)));

        verify(jdbc, times(2)).update(startsWith(MERGE), any(), any(), any(), eq(3));
    }

    @Test
    void failsClosedIfOracleFirstInsertRaceCannotBeResolved() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.update(startsWith(MERGE), any(), any(), any(), anyInt()))
                .thenThrow(new DuplicateKeyException("first")).thenThrow(new DuplicateKeyException("retry"));

        ApiException error = assertThrows(ApiException.class,
                () -> new ApiRateLimitService(jdbc).requireAllowed("seller-lead", "contact-key", 3,
                        Duration.ofHours(1)));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
    }

    @Test
    void periodicCleanupPreservesSentinelRowsUsedByDeliveryOtpCooldown() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.update(startsWith(MERGE), any(), any(), any(), anyInt())).thenReturn(1);
        ApiRateLimitService service = new ApiRateLimitService(jdbc);

        for (int i = 0; i < 100; i++) {
            service.requireAllowed("cleanup-test", "key-" + i, 3, Duration.ofMinutes(1));
        }

        verify(jdbc).update(
                eq("DELETE FROM API_RATE_LIMIT_BUCKETS WHERE EXPIRES_AT < ? AND WINDOW_START <> TIMESTAMP '1970-01-01 00:00:00'"),
                any());
    }

    @Test
    void probeCleanupDeletesOnlyTheHashedBucketKey() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ApiRateLimitService service = new ApiRateLimitService(jdbc);

        service.clearBucket("e2e-probe", "run-id:probe-key");

        org.mockito.ArgumentCaptor<Object[]> arguments = org.mockito.ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).update(eq("DELETE FROM API_RATE_LIMIT_BUCKETS WHERE BUCKET_KEY = ?"), arguments.capture());
        Object[] bound = arguments.getValue();
        assertEquals(1, bound.length);
        assertEquals(64, String.valueOf(bound[0]).length());
        assertNotEquals("run-id:probe-key", bound[0]);
    }

}
