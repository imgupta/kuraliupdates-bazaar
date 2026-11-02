package com.kuraliupdates.bazaar.diagnostics;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * One-shot, read-only Oracle metadata preflight for Phase 0.
 *
 * Activate only with the phase0-diagnostics Spring profile. The matching
 * profile configuration disables Flyway so this runner can inspect a schema
 * whose migration history currently prevents normal application startup.
 * It deliberately never reads business rows or changes schema/history.
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

        try {
            report.put("currentSchema", jdbcTemplate.queryForObject(
                    "SELECT SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') FROM DUAL", String.class));
            report.put("databaseVersion", jdbcTemplate.queryForObject(
                    "SELECT VERSION FROM PRODUCT_COMPONENT_VERSION WHERE ROWNUM = 1",
                    String.class));
            report.put("flywayHistoryOwners", jdbcTemplate.queryForList(
                    "SELECT OWNER FROM ALL_TABLES WHERE TABLE_NAME = 'FLYWAY_SCHEMA_HISTORY' ORDER BY OWNER",
                    String.class));

            List<Map<String, Object>> migrationV30 = jdbcTemplate.queryForList(
                    "SELECT INSTALLED_RANK, VERSION, DESCRIPTION, TYPE, SUCCESS, INSTALLED_ON " +
                    "FROM FLYWAY_SCHEMA_HISTORY WHERE VERSION = '30' ORDER BY INSTALLED_RANK");
            report.put("migrationV30", migrationV30);

            List<Map<String, Object>> otpConstraints = jdbcTemplate.queryForList(
                    "SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, SEARCH_CONDITION_VC, STATUS, VALIDATED " +
                    "FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'AUTH_OTPS' " +
                    "AND CONSTRAINT_TYPE = 'C' ORDER BY CONSTRAINT_NAME");
            report.put("authOtpCheckConstraints", otpConstraints);

            report.put("authOtpsTablePresent", jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM USER_TABLES WHERE TABLE_NAME = 'AUTH_OTPS'", Integer.class) > 0);
            report.put("status", "READ_ONLY_CHECKS_COMPLETED");
        } catch (Exception ex) {
            // Do not log SQL, connection strings, exception messages or credentials.
            report.put("status", "PREFLIGHT_INCOMPLETE");
            report.put("failedCheckType", ex.getClass().getSimpleName());
            log.error("PHASE0_ORACLE_PREFLIGHT {}", report);
            return;
        }

        log.info("PHASE0_ORACLE_PREFLIGHT {}", report);
    }
}
