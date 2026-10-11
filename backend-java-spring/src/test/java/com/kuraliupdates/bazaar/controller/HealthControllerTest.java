package com.kuraliupdates.bazaar.controller;

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
    void reportsUpOnlyWhenDatasourceConnectionIsValid() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(3)).thenReturn(true);

        ResponseEntity<Map<String, Object>> response = new HealthController(dataSource).checkHealth();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("UP", response.getBody().get("status"));
        assertEquals("UP", response.getBody().get("database"));
        verify(connection).close();
    }

    @Test
    void reportsServiceUnavailableWhenConnectionIsInvalid() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(3)).thenReturn(false);

        ResponseEntity<Map<String, Object>> response = new HealthController(dataSource).checkHealth();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("DEGRADED", response.getBody().get("status"));
        assertEquals("UNAVAILABLE", response.getBody().get("database"));
        verify(connection).close();
    }

    @Test
    void doesNotExposeDatabaseExceptionsOrSecrets() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        when(dataSource.getConnection()).thenThrow(new SQLException("sensitive connection details"));

        ResponseEntity<Map<String, Object>> response = new HealthController(dataSource).checkHealth();

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("DEGRADED", response.getBody().get("status"));
        assertEquals("UNAVAILABLE", response.getBody().get("database"));
        assertFalse(response.getBody().toString().contains("sensitive connection details"));
    }
}
