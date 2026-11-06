package com.kuraliupdates.bazaar.config;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Performs a narrowly-scoped recovery for the known failed Oracle V30 migration.
 *
 * Flyway's repair operation removes failed migration records from schema history;
 * the corrected V30 migration is then re-executed by migrate(). No other failed
 * migration is automatically repaired.
 */
@Configuration
public class FlywayRecoveryConfiguration {
    private static final Logger log = LoggerFactory.getLogger(FlywayRecoveryConfiguration.class);
    private static final String RECOVERABLE_VERSION = "30";

    @Bean
    FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> migrateWithKnownV30Recovery(flyway);
    }

    static void migrateWithKnownV30Recovery(Flyway flyway) {
        List<MigrationInfo> failedMigrations = Arrays.stream(flyway.info().all())
                .filter(info -> info.getState() == MigrationState.FAILED)
                .collect(Collectors.toList());

        if (!failedMigrations.isEmpty()) {
            boolean onlyKnownV30Failure = failedMigrations.size() == 1
                    && failedMigrations.get(0).getVersion() != null
                    && RECOVERABLE_VERSION.equals(failedMigrations.get(0).getVersion().getVersion());

            if (!onlyKnownV30Failure) {
                String versions = failedMigrations.stream()
                        .map(info -> info.getVersion() == null ? "repeatable" : info.getVersion().getVersion())
                        .collect(Collectors.joining(", "));
                throw new IllegalStateException(
                        "Flyway startup found failed migration(s) outside the approved V30 recovery scope: "
                                + versions + ". Automatic repair was not performed.");
            }

            log.warn("Detected the known failed Flyway V30 migration. Repairing its failed schema-history entry "
                    + "and rerunning the corrected, idempotent V30 migration.");
            flyway.repair();
        }

        flyway.migrate();
    }
}
