package com.kuraliupdates.bazaar.diagnostics;

import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PhaseZeroOraclePreflightTest {

    @Test
    void performsOnlyReadOnlyMetadataQueries() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(contains("SYS_CONTEXT"), eq(String.class))).thenReturn("APP");
        when(jdbc.queryForList(contains("ALL_TABLES"), eq(String.class))).thenReturn(List.of("APP"));
        when(jdbc.queryForList(contains("FLYWAY_SCHEMA_HISTORY"))).thenReturn(List.of(
                Map.of("INSTALLED_RANK", 30, "VERSION", "30", "DESCRIPTION", "otp types",
                        "TYPE", "SQL", "SUCCESS", true, "CHECKSUM", 123)));
        when(jdbc.queryForObject(contains("USER_TABLES"), eq(Integer.class))).thenReturn(1);
        when(jdbc.queryForList(contains("USER_CONSTRAINTS"))).thenReturn(List.of(
                Map.of("CONSTRAINT_NAME", "CK_AUTH_OTPS_TYPE", "CONSTRAINT_TYPE", "C",
                        "STATUS", "ENABLED", "VALIDATED", "VALIDATED")));

        new PhaseZeroOraclePreflight(jdbc).run(mock(ApplicationArguments.class));

        verify(jdbc).queryForObject(contains("SYS_CONTEXT"), eq(String.class));
        verify(jdbc).queryForList(contains("ALL_TABLES"), eq(String.class));
        verify(jdbc).queryForList(contains("FLYWAY_SCHEMA_HISTORY"));
        verify(jdbc).queryForObject(contains("USER_TABLES"), eq(Integer.class));
        verify(jdbc).queryForList(contains("USER_CONSTRAINTS"));
        verify(jdbc, never()).update(anyString());
        verify(jdbc, never()).execute(anyString());
        verify(jdbc, never()).batchUpdate(anyString());
        verifyNoMoreInteractions(jdbc);
    }

    @Test
    void safelyContinuesWhenOracleMetadataIsNotVisible() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(contains("SYS_CONTEXT"), eq(String.class))).thenReturn("APP");
        when(jdbc.queryForList(contains("ALL_TABLES"), eq(String.class)))
                .thenThrow(new org.springframework.jdbc.CannotGetJdbcConnectionException("unavailable"));
        when(jdbc.queryForObject(contains("USER_TABLES"), eq(Integer.class))).thenReturn(0);
        when(jdbc.queryForList(contains("USER_CONSTRAINTS"))).thenReturn(List.of());

        new PhaseZeroOraclePreflight(jdbc).run(mock(ApplicationArguments.class));

        verify(jdbc).queryForList(contains("ALL_TABLES"), eq(String.class));
        verify(jdbc).queryForObject(contains("USER_TABLES"), eq(Integer.class));
        verify(jdbc).queryForList(contains("USER_CONSTRAINTS"));
        verify(jdbc, never()).update(anyString());
        verify(jdbc, never()).execute(anyString());
        verify(jdbc, never()).batchUpdate(anyString());
    }
}
