package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.config.DatabaseMigrationState;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "System Health", description = "Service liveness and database readiness probes")
public class HealthController {
    private final DataSource dataSource;
    private final String renderGitCommit;
    private final DatabaseMigrationState migrationState;

    public HealthController(DataSource dataSource,
            @Value("${RENDER_GIT_COMMIT:unknown}") String renderGitCommit,
            DatabaseMigrationState migrationState) {
        this.dataSource = dataSource;
        this.renderGitCommit = renderGitCommit;
        this.migrationState = migrationState;
    }

    /**
     * Process liveness only. Deliberately does not acquire a connection or
     * report database health; safe for platform startup probes.
     */
    @GetMapping("/health/live")
    @Operation(summary = "API process liveness; does not inspect database connectivity")
    public ResponseEntity<Map<String, Object>> checkLiveness() {
        Map<String, Object> response = new HashMap<>();
        response.put("service", "kuraliupdates-bazaar-api");
        response.put("status", "UP");
        response.put("probe", "liveness");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }

    /**
     * Database readiness. Does not acquire a connection until Flyway has
     * completed successfully; failure details are intentionally redacted.
     */
    @GetMapping({"/health", "/health/ready"})
    @Operation(summary = "Database and migration readiness check")
    public ResponseEntity<Map<String, Object>> checkHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("service", "kuraliupdates-bazaar-api");
        response.put("commit", renderGitCommit);
        response.put("timestamp", System.currentTimeMillis());
        response.put("migration", migrationState.getStatus().name());

        if (!migrationState.isReady()) {
            response.put("status", "DEGRADED");
            response.put("database", "NOT_CHECKED");
            if (migrationState.getFailureType() != null) {
                response.put("migrationFailureType", migrationState.getFailureType());
            }
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
        }

        try (Connection connection = dataSource.getConnection()) {
            boolean valid = connection.isValid(3);
            if (!valid) {
                response.put("status", "DEGRADED");
                response.put("database", "UNAVAILABLE");
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
            }
            response.put("status", "UP");
            response.put("database", "UP");
            return ResponseEntity.ok(response);
        } catch (SQLException ex) {
            // Do not expose connection strings, schema names, credentials or exception details.
            response.put("status", "DEGRADED");
            response.put("database", "UNAVAILABLE");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
        }
    }
}
