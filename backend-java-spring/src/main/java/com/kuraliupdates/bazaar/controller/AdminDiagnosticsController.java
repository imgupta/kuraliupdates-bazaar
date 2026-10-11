package com.kuraliupdates.bazaar.controller;

import com.kuraliupdates.bazaar.entity.UserEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/diagnostics")
@RequiredArgsConstructor
@Tag(name = "Admin Diagnostics", description = "Read-only database and migration diagnostics")
public class AdminDiagnosticsController {

    private static final Map<String, String> TABLES = Map.ofEntries(
            Map.entry("users", "USERS"),
            Map.entry("savedAddresses", "USER_ADDRESSES"),
            Map.entry("sessions", "USER_SESSIONS"),
            Map.entry("authenticationOtps", "AUTH_OTPS"),
            Map.entry("sellers", "SELLERS"),
            Map.entry("deliveryAgents", "DELIVERY_AGENTS"),
            Map.entry("products", "PRODUCTS"),
            Map.entry("orders", "ORDERS"),
            Map.entry("orderItems", "ORDER_ITEMS"),
            Map.entry("billDiscounts", "BILL_DISCOUNTS"),
            Map.entry("coupons", "COUPONS"),
            Map.entry("dailyHelpProfessionals", "DAILY_HELP_PROFESSIONALS"),
            Map.entry("dailyHelpSlots", "DAILY_HELP_PROFESSIONAL_SLOTS"),
            Map.entry("dailyHelpBookings", "DAILY_HELP_BOOKINGS"),
            Map.entry("dailyHelpServices", "DAILY_HELP_SERVICES"),
            Map.entry("searchTrends", "SEARCH_TRENDS"),
            Map.entry("chatMessages", "CHAT_MESSAGES"),
            Map.entry("negotiationChats", "NEGOTIATION_CHATS")
    );

    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    @Transactional(readOnly = true)
    @Operation(summary = "Inspect database connectivity, table counts and Flyway history without changing data")
    public Map<String, Object> getDiagnostics(Authentication authentication) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("checkedAt", Instant.now().toString());

        Map<String, Object> database = new LinkedHashMap<>();
        try {
            String schema = jdbcTemplate.queryForObject(
                    "SELECT SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') FROM DUAL", String.class);
            database.put("status", "UP");
            database.put("schema", schema == null ? "UNKNOWN" : schema);
        } catch (Exception ignored) {
            database.put("status", "DEGRADED");
            database.put("schema", "UNKNOWN");
        }
        response.put("database", database);

        String signedInEmail = authentication != null && authentication.getPrincipal() instanceof UserEntity user
                ? user.getEmail() : null;
        Map<String, Object> adminIdentity = new LinkedHashMap<>();
        if (signedInEmail != null && !signedInEmail.isBlank()) {
            try {
                Long matches = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM USERS WHERE LOWER(EMAIL) = LOWER(?)",
                        Long.class, signedInEmail);
                adminIdentity.put("currentAdminAccountPresent", matches != null && matches > 0);
            } catch (Exception ignored) {
                adminIdentity.put("currentAdminAccountPresent", "UNKNOWN");
            }
        } else {
            adminIdentity.put("currentAdminAccountPresent", "UNKNOWN");
        }
        response.put("identityCheck", adminIdentity);

        Map<String, Object> counts = new LinkedHashMap<>();
        List<String> failedCountQueries = new ArrayList<>();
        for (Map.Entry<String, String> table : TABLES.entrySet()) {
            try {
                Long count = jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM " + table.getValue(), Long.class);
                counts.put(table.getKey(), Map.of("status", "OK", "count", count == null ? 0L : count));
            } catch (Exception ignored) {
                Map<String, Object> unavailable = new LinkedHashMap<>();
                unavailable.put("status", "ERROR");
                unavailable.put("count", null);
                counts.put(table.getKey(), unavailable);
                failedCountQueries.add(table.getKey());
            }
        }
        response.put("tableCounts", counts);
        response.put("tableCountErrors", failedCountQueries);

        Map<String, Object> migration = new LinkedHashMap<>();
        try {
            List<Map<String, Object>> latest = jdbcTemplate.query(
                    "SELECT VERSION, DESCRIPTION, SUCCESS, INSTALLED_ON FROM " +
                            "(SELECT VERSION, DESCRIPTION, SUCCESS, INSTALLED_ON " +
                            "FROM \"flyway_schema_history\" ORDER BY INSTALLED_RANK DESC) WHERE ROWNUM <= 10",
                    (rs, rowNum) -> migrationRow(rs));
            migration.put("historyStatus", "OK");
            migration.put("latest", latest);
            List<Boolean> v13 = jdbcTemplate.query(
                    "SELECT SUCCESS FROM \"flyway_schema_history\" WHERE VERSION = '13'",
                    (rs, rowNum) -> rs.getBoolean("SUCCESS"));
            migration.put("v13Status", v13.isEmpty() ? "NOT_FOUND" : (v13.get(0) ? "SUCCESS" : "FAILED"));
        } catch (Exception ignored) {
            migration.put("historyStatus", "ERROR");
            migration.put("latest", List.of());
            migration.put("v13Status", "UNKNOWN");
        }
        response.put("migrations", migration);
        response.put("readOnly", true);
        return response;
    }

    private Map<String, Object> migrationRow(ResultSet rs) throws SQLException {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("version", rs.getString("VERSION"));
        row.put("description", rs.getString("DESCRIPTION"));
        row.put("success", rs.getBoolean("SUCCESS"));
        var installedOn = rs.getTimestamp("INSTALLED_ON");
        row.put("installedOn", installedOn == null ? null : installedOn.toInstant().toString());
        return row;
    }
}
