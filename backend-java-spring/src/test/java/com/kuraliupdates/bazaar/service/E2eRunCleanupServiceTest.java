package com.kuraliupdates.bazaar.service;

import com.kuraliupdates.bazaar.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.jdbc.core.JdbcTemplate;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class E2eRunCleanupServiceTest {
    @Mock private JdbcTemplate jdbc;
    @InjectMocks private E2eRunCleanupService cleanupService;

    @Test
    void refusesCleanupBeforeAnyWriteWhenTaggedOrderReferencesNonSyntheticData() {
        when(jdbc.queryForObject(anyString(), eq(Long.class), eq("E2E-run-123")))
                .thenReturn(1L, 0L, 0L);

        assertThrows(ApiException.class, () -> cleanupService.cleanup("E2E-run-123"));

        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }
}
