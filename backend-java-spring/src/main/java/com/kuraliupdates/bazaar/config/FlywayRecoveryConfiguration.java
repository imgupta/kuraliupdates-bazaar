package com.kuraliupdates.bazaar.config;

import java.sql.SQLException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.Arrays;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Executor;
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
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

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

    @Bean(name = "flywayMigrationExecutor")
    ThreadPoolTaskExecutor flywayMigrationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(1);
        executor.setThreadNamePrefix("flyway-startup-migration-");
        // Allow an in-flight Oracle migration a bounded graceful shutdown window.
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(120);
        return executor;
    }

    @Bean
    FlywayMigrationStrategy flywayMigrationStrategy(
            DatabaseMigrationState migrationState,
            @Qualifier("flywayMigrationExecutor") Executor executor) {
        return flyway -> scheduleMigration(flyway, migrationState, executor);
    }

    @Bean
    FilterRegistrationBean<MigrationReadinessFilter> migrationReadinessFilterRegistration(
            DatabaseMigrationState migrationState) {
        FilterRegistrationBean<MigrationReadinessFilter> registration =
                new FilterRegistrationBean<>(new MigrationReadinessFilter(migrationState));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 20);
        registration.addUrlPatterns("/*");
        return registration;
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
                    log.error("Flyway startup migration failed; API remains unready. Safe cause summary: {}",
                            safeFailureSummary(failure));
                }
            });
        } catch (RejectedExecutionException failure) {
            migrationState.markFailed(failure);
            throw failure;
        }
    }

    /**
     * Summarize exception types and JDBC diagnostic codes without logging
     * exception messages, which may contain connection details or secrets.
     */
    static String safeFailureSummary(Throwable failure) {
        List<String> causes = new ArrayList<>();
        Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        Deque<Throwable> pending = new ArrayDeque<>();
        if (failure != null) {
            pending.addLast(failure);
        }
        while (!pending.isEmpty() && causes.size() < 12) {
            Throwable current = pending.removeFirst();
            if (!seen.add(current)) {
                continue;
            }

            String description = current.getClass().getSimpleName();
            if (current instanceof SQLException sqlException) {
                description += "[sqlState=" + sqlException.getSQLState()
                        + ",vendorCode=" + sqlException.getErrorCode() + "]";
                // JDBC drivers frequently attach the actionable Oracle/TLS
                // diagnostic through SQLException.getNextException(), not
                // Throwable.getCause(). Include it without exposing raw URLs
                // or credentials.
                SQLException next = sqlException.getNextException();
                if (next != null && !seen.contains(next)) {
                    pending.addLast(next);
                }
            }
            String safeMessage = sanitizeFailureMessage(current.getMessage());
            if (!safeMessage.isBlank()) {
                description += "[detail=" + safeMessage + "]";
            }
            causes.add(description);

            Throwable cause = current.getCause();
            if (cause != null && !seen.contains(cause)) {
                pending.addLast(cause);
            }
            for (Throwable suppressed : current.getSuppressed()) {
                if (suppressed != null && !seen.contains(suppressed)) {
                    pending.addLast(suppressed);
                }
            }
        }
        return causes.isEmpty() ? "Unknown" : String.join(" -> ", causes);
    }

    /**
     * Retain useful parser/driver diagnostics while removing common credential
     * and connection-string patterns. Messages are bounded to keep logs safe.
     */
    static String sanitizeFailureMessage(String message) {
        if (message == null || message.isBlank()) {
            return "";
        }
        String safe = message
                .replaceAll("(?i)(password|passwd|pwd|token|secret|credential)(\\s*[=:]\\s*)[^\\s,;]+",
                        "$1$2[REDACTED]")
                .replaceAll("(?i)jdbc:[^\\s,;]+", "[JDBC_URL_REDACTED]")
                .replaceAll("(?i)https?://[^\\s,;]+", "[URL_REDACTED]")
                .replaceAll("(?i)(wallet|keystore|truststore)(\\s*[=:]\\s*)[^\\s,;]+",
                        "$1$2[PATH_REDACTED]");
        safe = safe.replaceAll("[\\r\\n\\t]+", " ").trim();
        // Only retain known technical diagnostics; generic exception text can
        // contain arbitrary configuration or application data.
        if (!safe.matches("(?is).*(ASN.?1|length is too big|unable to initialize|network adapter|ORA-[0-9]{4,5}|SQLRecoverableException|keystore|truststore|wallet).*")) {
            return "";
        }
        return safe.length() > 240 ? safe.substring(0, 240) + "..." : safe;
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
