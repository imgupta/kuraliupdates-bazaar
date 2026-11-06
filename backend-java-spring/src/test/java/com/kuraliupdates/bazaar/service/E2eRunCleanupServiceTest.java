package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.jdbc.core.JdbcTemplate;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class E2eRunCleanupServiceTest {
    @Mock private JdbcTemplate jdbc;
    @InjectMocks private E2eRunCleanupService cleanupService;

    @Test
    void refusesCleanupBeforeAnyWriteWhenTaggedOrderReferencesNonSyntheticData() {
        when(jdbc.queryForObject(anyString(), eq(Long.class), eq("E2E-run-123")))
                .thenReturn(1L, 0L, 0L, 0L, 0L, 0L);

        assertThrows(ApiException.class, () -> cleanupService.cleanup("E2E-run-123"));

        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void validatesDailyHelpSlotOwnershipThroughBookingIdWithoutAssumingBookingHasSlotId() {
        when(jdbc.queryForObject(anyString(), eq(Long.class), any(Object[].class))).thenReturn(0L);
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(0);

        cleanupService.cleanup("E2E-run-123");

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(7)).queryForObject(sql.capture(), eq(Long.class), any(Object[].class));
        List<String> statements = sql.getAllValues();

        assertFalse(statements.stream().anyMatch(statement -> statement.contains("b.SLOT_ID")),
                "DAILY_HELP_BOOKINGS has no SLOT_ID column");
        assertTrue(statements.stream().anyMatch(statement -> statement.contains("s.BOOKING_ID = b.BOOKING_ID")),
                "booking preflight must locate its run-owned slot through the slot's BOOKING_ID");
        assertTrue(statements.stream().anyMatch(statement -> statement.contains("b.BOOKING_ID = s.BOOKING_ID")),
                "slot preflight must reject links to bookings owned by another run");
    }

}
