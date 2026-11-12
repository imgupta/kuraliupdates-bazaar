package com.kuraliupdates.bazaar.config;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.stream.Collectors;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationInitializer;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Runs Flyway after the servlet container has bound its HTTP port.
 *
 * The listener can therefore satisfy Render's port detection while Oracle
 * connectivity/migration proceeds. MigrationReadinessFilter blocks all
 * application traffic until migration succeeds. The narrowly-scoped V30
 * recovery remains unchanged and is never broadened automatically.
 */
@Configuration
public class FlywayRecoveryConfiguration {
    private static final Logger log = LoggerFactory.getLogger(FlywayRecoveryConfiguration.class);
    private static final String RECOVERABLE_VERSION = "30";

    @Bean(name = "flywayMigrationExecutor", destroyMethod = "shutdownNow")
    ExecutorService flywayMigrationExecutor() {
        return Executors.newSingleThreadExecutor(task -> {
            Thread thread = new Thread(task, "flyway-startup-migration");
            thread.setDaemon(true);
            return thread;
        });
    }

    @Bean
    FlywayMigrationStrategy flywayMigrationStrategy(
            DatabaseMigrationState migrationState,
            @Qualifier("flywayMigrationExecutor") Executor executor) {
        return flyway -> scheduleMigration(flyway, migrationState, executor);
    }

    /**
     * Global lazy initialization can defer the Flyway initializer. An
     * ApplicationRunner is invoked after context refresh, when the embedded
     * server has already bound its port. Its dependency forces Flyway's
     * initializer to run even when no JPA repository has requested it yet.
     */
    @Bean
    ApplicationRunner ensureFlywayMigrationScheduled(FlywayMigrationInitializer initializer) {
        return args -> log.info("Flyway migration initializer is active; API readiness remains gated.");
    }

    static void scheduleMigration(Flyway flyway, DatabaseMigrationState migrationState, Executor executor) {
        migrationState.markRunning();
        try {
            executor.execute(() -> {
                try {
                    migrateWithKnownV30Recovery(flyway);
                    migrationState.markReady();
                    log.info("Flyway startup migration completed; API readiness gate opened.");
                } catch (RuntimeException failure) {
                    migrationState.markFailed(failure);
                    log.error("Flyway startup migration failed; API remains unready. Failure type: {}",
                            failure.getClass().getSimpleName());
                }
            });
        } catch (RejectedExecutionException failure) {
            migrationState.markFailed(failure);
            throw failure;
        }
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
