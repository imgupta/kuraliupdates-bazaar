package com.kuraliupdates.bazaar.config;

import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Centralizes Flyway startup behavior.
 *
 * A repair is deliberately opt-in and intended only for controlled recovery
 * when an intentionally retired migration exists in schema history.
 */
@Configuration
public class FlywayMigrationConfig {

    @Bean
    FlywayMigrationStrategy flywayMigrationStrategy(
            @Value("${app.flyway.repair-before-migrate:false}") boolean repairBeforeMigrate) {
        return flyway -> {
            if (repairBeforeMigrate) {
                flyway.repair();
            }
            flyway.migrate();
        };
    }
}
