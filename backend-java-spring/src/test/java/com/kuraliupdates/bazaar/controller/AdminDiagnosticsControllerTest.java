package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.UserEntity;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminDiagnosticsControllerTest {

    @Test
    void returnsSanitizedReadOnlyDiagnostics() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(contains("SYS_CONTEXT"), eq(String.class))).thenReturn("ADMIN");
        when(jdbc.queryForObject(contains("COUNT(*) FROM USERS"), eq(Long.class), any(Object[].class))).thenReturn(1L);
        when(jdbc.queryForObject(argThat(sql -> sql.startsWith("SELECT COUNT(*) FROM") && !sql.contains("USERS")), eq(Long.class)))
                .thenReturn(0L);
        when(jdbc.query(startsWith("SELECT VERSION, DESCRIPTION, SUCCESS"), any(org.springframework.jdbc.core.RowMapper.class)))
                .thenReturn(List.of(Map.of("version", "13", "description", "reset staging test data", "success", true)));
        when(jdbc.query(contains("WHERE VERSION = '13'"), any(org.springframework.jdbc.core.RowMapper.class)))
                .thenReturn(List.of(true));

        UserEntity admin = UserEntity.builder().email("admin-check@example.com").name("Admin").userId("admin-1").build();
        var auth = new UsernamePasswordAuthenticationToken(admin, "opaque", List.of());
        Map<String, Object> response = new AdminDiagnosticsController(jdbc).getDiagnostics(auth);

        assertEquals(true, response.get("readOnly"));
        assertEquals("UP", ((Map<?, ?>) response.get("database")).get("status"));
        assertEquals(true, ((Map<?, ?>) response.get("identityCheck")).get("currentAdminAccountPresent"));
        assertEquals("SUCCESS", ((Map<?, ?>) response.get("migrations")).get("v13Status"));
        assertFalse(response.toString().contains("admin-check@example.com"));
        verify(jdbc, atLeastOnce()).queryForObject(startsWith("SELECT COUNT(*) FROM"), eq(Long.class));
    }

    @Test
    void hidesDatabaseExceptionDetailsAndFlagsUnknownMigrationWhenHistoryIsUnavailable() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(contains("SYS_CONTEXT"), eq(String.class))).thenReturn("ADMIN");
        when(jdbc.queryForObject(contains("COUNT(*) FROM USERS"), eq(Long.class), any(Object[].class))).thenReturn(1L);
        when(jdbc.queryForObject(argThat(sql -> sql.startsWith("SELECT COUNT(*) FROM") && !sql.contains("USERS")), eq(Long.class)))
                .thenReturn(0L);
        when(jdbc.query(startsWith("SELECT VERSION, DESCRIPTION, SUCCESS"), any(org.springframework.jdbc.core.RowMapper.class)))
                .thenThrow(new RuntimeException("sensitive database failure"));

        UserEntity admin = UserEntity.builder().email("admin-check@example.com").name("Admin").userId("admin-1").build();
        var auth = new UsernamePasswordAuthenticationToken(admin, "opaque", List.of());
        Map<String, Object> response = new AdminDiagnosticsController(jdbc).getDiagnostics(auth);
        Map<?, ?> migrations = (Map<?, ?>) response.get("migrations");

        assertEquals("ERROR", migrations.get("historyStatus"));
        assertEquals("UNKNOWN", migrations.get("v13Status"));
        assertFalse(response.toString().contains("sensitive database failure"));
    }
}
