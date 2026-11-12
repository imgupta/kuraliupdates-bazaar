package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.config.DatabaseMigrationState;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HealthControllerTest {

    @Test
    void livenessProbeDoesNotTouchDatasource() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        DatabaseMigrationState migrationState = new DatabaseMigrationState();

        ResponseEntity<Map<String, Object>> response =
                new HealthController(dataSource, "test-commit-sha", migrationState).checkLiveness();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("UP", response.getBody().get("status"));
        assertEquals("liveness", response.getBody().get("probe"));
        assertFalse(response.getBody().containsKey("database"));
        verifyNoInteractions(dataSource);
    }

    @Test
    void readinessDoesNotConnectToOracleBeforeMigrationCompletes() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        DatabaseMigrationState migrationState = new DatabaseMigrationState();
        migrationState.markRunning();

        ResponseEntity<Map<String, Object>> response =
                new HealthController(dataSource, "test-commit-sha", migrationState).checkHealth();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("RUNNING", response.getBody().get("migration"));
        assertEquals("NOT_CHECKED", response.getBody().get("database"));
        verifyNoInteractions(dataSource);
    }

    @Test
    void reportsUpOnlyWhenMigrationAndDatasourceAreReady() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        DatabaseMigrationState migrationState = new DatabaseMigrationState();
        migrationState.markReady();
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(3)).thenReturn(true);

        ResponseEntity<Map<String, Object>> response =
                new HealthController(dataSource, "test-commit-sha", migrationState).checkHealth();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("UP", response.getBody().get("status"));
        assertEquals("UP", response.getBody().get("database"));
        assertEquals("READY", response.getBody().get("migration"));
        assertEquals("test-commit-sha", response.getBody().get("commit"));
        verify(connection).close();
    }

    @Test
    void reportsServiceUnavailableWhenConnectionIsInvalid() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        DatabaseMigrationState migrationState = new DatabaseMigrationState();
        migrationState.markReady();
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(3)).thenReturn(false);

        ResponseEntity<Map<String, Object>> response =
                new HealthController(dataSource, "test-commit-sha", migrationState).checkHealth();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("DEGRADED", response.getBody().get("status"));
        assertEquals("UNAVAILABLE", response.getBody().get("database"));
        verify(connection).close();
    }

    @Test
    void doesNotExposeDatabaseExceptionsOrSecrets() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        DatabaseMigrationState migrationState = new DatabaseMigrationState();
        migrationState.markReady();
        when(dataSource.getConnection()).thenThrow(new SQLException("sensitive connection details"));

        ResponseEntity<Map<String, Object>> response =
                new HealthController(dataSource, "test-commit-sha", migrationState).checkHealth();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("DEGRADED", response.getBody().get("status"));
        assertEquals("UNAVAILABLE", response.getBody().get("database"));
        assertFalse(response.getBody().toString().contains("sensitive connection details"));
    }

    @Test
    void reportsMigrationFailureWithoutExposingExceptionDetails() {
        DataSource dataSource = mock(DataSource.class);
        DatabaseMigrationState migrationState = new DatabaseMigrationState();
        migrationState.markFailed(new IllegalStateException("sensitive database details"));

        ResponseEntity<Map<String, Object>> response =
                new HealthController(dataSource, "test-commit-sha", migrationState).checkHealth();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("FAILED", response.getBody().get("migration"));
        assertEquals("IllegalStateException", response.getBody().get("migrationFailureType"));
        assertFalse(response.getBody().toString().contains("sensitive database details"));
        verifyNoInteractions(dataSource);
    }
}
