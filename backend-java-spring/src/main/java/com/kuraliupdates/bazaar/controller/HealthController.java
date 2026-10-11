package com.kuraliupdates.bazaar.controller;

import io.swagger.v3.oas.annotations.Operation;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "System Health", description = "Service and database connectivity health probe")
public class HealthController {
    private final DataSource dataSource;

    @GetMapping("/health")
    @Operation(summary = "System health check")
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> resp = new HashMap<>();
        resp.put("service", "kuraliupdates-bazaar-api");
        resp.put("timestamp", System.currentTimeMillis());
        try (Connection connection = dataSource.getConnection()) {
            boolean valid = connection.isValid(3);
            if (!valid) {
                resp.put("status", "DEGRADED");
                resp.put("database", "UNAVAILABLE");
                return ResponseEntity.status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE).body(resp);
            }
            resp.put("status", "UP");
            resp.put("database", "UP");
            return ResponseEntity.ok(resp);
        } catch (SQLException ex) {
            // Do not expose connection strings, schema names, credentials or exception details.
            resp.put("status", "DEGRADED");
            resp.put("database", "UNAVAILABLE");
            return ResponseEntity.status(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE).body(resp);
        }
    }
}
