package com.kuraliupdates.bazaar.diagnostics;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * One-shot, read-only Oracle metadata preflight for Phase 0.
 * Activate only with the phase0-diagnostics Spring profile. That profile
 * disables Flyway so a failed migration cannot prevent metadata inspection.
 * This runner never reads business rows or changes schema/history.
 */
@Slf4j
@Component
@Profile("phase0-diagnostics")
@RequiredArgsConstructor
public class PhaseZeroOraclePreflight implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("profile", "phase0-diagnostics");
        report.put("flywayExecution", "DISABLED_FOR_READ_ONLY_PREFLIGHT");

        capture(report, "currentSchema", () -> jdbcTemplate.queryForObject(
                "SELECT SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') FROM DUAL", String.class));

        List<String> historyOwners = capture(report, "flywayHistoryOwners", () ->
                jdbcTemplate.queryForList(
                        "SELECT OWNER FROM ALL_TABLES WHERE TABLE_NAME = 'FLYWAY_SCHEMA_HISTORY' ORDER BY OWNER",
                        String.class));
        if (historyOwners != null) {
            List<Map<String, Object>> histories = new ArrayList<>();
            for (String owner : historyOwners) {
                if (owner == null || !owner.matches("[A-Z][A-Z0-9_$#]*")) {
                    continue;
                }
                capture(report, "flywayHistory_" + owner, () -> jdbcTemplate.queryForList(
                        "SELECT INSTALLED_RANK, VERSION, DESCRIPTION, TYPE, SUCCESS, INSTALLED_ON, CHECKSUM " +
                        "FROM " + owner + ".FLYWAY_SCHEMA_HISTORY WHERE VERSION = '30' ORDER BY INSTALLED_RANK"));
                Object rows = report.get("flywayHistory_" + owner);
                if (rows instanceof List<?> list) {
                    histories.addAll((List<Map<String, Object>>) list);
                }
            }
            report.put("migrationV30RowsAcrossVisibleOwners", histories);
        }

        capture(report, "authOtpsTablePresent", () -> jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = 'AUTH_OTPS'", Integer.class) > 0);
        capture(report, "authOtpCheckConstraints", () -> jdbcTemplate.queryForList(
                "SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, SEARCH_CONDITION_VC, STATUS, VALIDATED " +
                "FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'AUTH_OTPS' " +
                "AND CONSTRAINT_TYPE = 'C' ORDER BY CONSTRAINT_NAME"));

        report.put("readOnly", true);
        report.put("status", report.keySet().stream().anyMatch(k -> k.endsWith("Error"))
                ? "PREFLIGHT_PARTIAL" : "READ_ONLY_CHECKS_COMPLETED");
        log.info("PHASE0_ORACLE_PREFLIGHT {}", report);
    }

    private <T> T capture(Map<String, Object> report, String key, Supplier<T> query) {
        try {
            T value = query.get();
            report.put(key, value);
            return value;
        } catch (Exception ex) {
            // Never log exception messages, SQL, connection details or credentials.
            report.put(key + "Error", ex.getClass().getSimpleName());
            return null;
        }
    }
}
